<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Illuminate\Database\QueryException;
use Throwable;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class AuthController extends Controller
{
    // ====================== REGISTER ======================
    public function register(Request $request)
    {
        // UBAH: validasi name agar hanya huruf + spasi
        $data = $request->validate([
            'name' => ['required','regex:/^[A-Za-z\s]+$/u','min:2','max:100'],
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'captcha_token' => 'required',
        ]);

        // NEW: verify captcha (tetap panggil helper kalau sudah ada)
        if (method_exists($this,'verifyCaptcha') && !$this->verifyCaptcha($request)) {
            return response()->json(['message' => 'Captcha tidak valid.'], 422);
        }

        // Generate OTP
        $otp = (string) random_int(100000, 999999);

        $user = \App\Models\User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => bcrypt($data['password']),
            'verification_code' => $otp,
            'is_verified' => false,
        ]);

        // Kirim email OTP (text sederhana)
        try {
            Mail::raw(
                "Halo {$user->name},\n\nKode verifikasi akun kamu: {$otp}\nMasukkan kode ini di halaman verifikasi untuk mengaktifkan akun.\n\nTerima kasih,\nTechStore",
                function ($m) use ($user) {
                    $m->to($user->email)->subject('Kode Verifikasi TechStore');
                }
            );
        } catch (\Throwable $e) {
            // log tapi tetap lanjut
            \Log::error('Mail OTP gagal: '.$e->getMessage());
        }

        return response()->json([
            'message' => 'Registrasi berhasil. Kode OTP telah dikirim ke email.',
            'user_id' => $user->id,
        ], 201);
    }

    // ====================== VERIFIKASI EMAIL ======================
    public function verify(Request $request)
    {
        // Terima salah satu: code atau verification_code
        $request->validate([
            'email' => 'required|email',
            'code' => 'required_without:verification_code|string|nullable',
            'verification_code' => 'required_without:code|string|nullable',
        ]);

        $email = (string) $request->input('email');
        $code  = $request->input('code', $request->input('verification_code')); // FIX: dukung keduanya

        $user = \App\Models\User::where('email', $email)->first();
        if (!$user) {
            return response()->json(['message' => 'Email tidak ditemukan'], 404);
        }
        if ($user->is_verified) {
            return response()->json(['message' => 'Akun sudah terverifikasi']);
        }
        if (!$code || $user->verification_code !== (string) $code) {
            return response()->json(['message' => 'Kode verifikasi salah'], 422);
        }

        $user->is_verified = true;
        $user->email_verified_at = now();
        $user->verification_code = null;
        $user->save();

        // NEW: otomatis login setelah verifikasi
        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'message' => 'Verifikasi berhasil',
            'token' => $token,
            'user' => $user, // hidden fields tetap disembunyikan oleh model
        ]);
    }

    // ====================== LOGIN MANUAL ======================
    public function login(Request $request)
    {
        // UBAH: captcha_token optional
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'captcha_token' => 'sometimes|nullable|string',
        ]);

        // Ambil user dulu untuk cek role
        $user = \App\Models\User::where('email', $data['email'])->first();
        $isAdmin = $user && ($user->role === 'admin');

        // Cek captcha hanya jika bukan admin
        if (!$isAdmin) {
            if (method_exists($this,'verifyCaptcha') && !$this->verifyCaptcha($request)) {
                return response()->json(['message' => 'Captcha tidak valid. Coba lagi.'], 422);
            }
        }

        // Proses auth standar
        if (!$user || !\Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Kredensial tidak valid'], 401);
        }

        // Token baru
        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'token' => $token,
            'user' => $user,
        ]);
    }

    // UBAH: verifikasi 2FA terhadap verification_code + two_factor_expires_at
    public function verifyTwoFactor(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
        ]);

        $user = \App\Models\User::where('email', $data['email'])->first();
        if (!$user || !$user->two_factor_enabled) {
            return response()->json(['message' => '2FA tidak aktif untuk akun ini'], 422);
        }

        $valid = hash_equals((string) ($user->verification_code ?? ''), (string) $data['code']);
        $notExpired = $user->two_factor_expires_at && Carbon::parse($user->two_factor_expires_at)->gt(now());
        if (!$valid || !$notExpired) {
            return response()->json(['message' => 'Kode OTP tidak valid atau kedaluwarsa'], 422);
        }

        // Bersihkan OTP & expiry lalu terbitkan token
        $user->verification_code = null;
        $user->two_factor_expires_at = null;
        $user->save();

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'message' => 'Verifikasi berhasil',
            'token' => $token,
            'user' => $user,
        ]);
    }

    // ====================== LOGOUT ======================
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Logout berhasil']);
    }

    // ====================== RESEND VERIFIKASI ======================
    public function resendVerification(Request $request)
    {
        $user = \App\Models\User::where('email', $request->input('email'))->first();
        if (!$user) {
            return response()->json(['message' => 'Email tidak ditemukan'], 404);
        }
        if ($user->is_verified) {
            return response()->json(['message' => 'Akun sudah terverifikasi'], 422);
        }

        // Regenerate OTP
        $otp = (string) random_int(100000, 999999);
        $user->verification_code = $otp;
        $user->save();

        try {
            Mail::raw(
                "Halo {$user->name},\n\nKode verifikasi terbaru: {$otp}\nJika kamu tidak meminta kode ini abaikan email ini.\n\nTechStore",
                function ($m) use ($user) {
                    $m->to($user->email)->subject('Kode Verifikasi Baru TechStore');
                }
            );
        } catch (\Throwable $e) {
            \Log::error('Mail resend OTP gagal: '.$e->getMessage());
        }

        return response()->json(['message' => 'Kode verifikasi baru telah dikirim ke email.']);
    }

    // ====================== GOOGLE LOGIN ======================
    public function redirectToGoogle()
    {
        // Pastikan config services.google terisi dari env agar redirect_uri disertakan
        config([
            'services.google.client_id' => env('GOOGLE_CLIENT_ID'),
            'services.google.client_secret' => env('GOOGLE_CLIENT_SECRET'),
            'services.google.redirect' => env('GOOGLE_REDIRECT_URL'),
        ]);

        try {
            // Untuk SPA/API: kembalikan URL redirect Google agar frontend membuka window.location = url
            $redirectUrl = Socialite::driver('google')->stateless()->redirect()->getTargetUrl();
            return response()->json(['url' => $redirectUrl]);
        } catch (\Exception $e) {
            Log::error('Google redirect error: '.$e->getMessage(), ['exception' => $e]);
            return response()->json([
                'error' => 'Gagal membuat URL Google',
                'detail' => $e->getMessage()
            ], 500);
        }
    }

    public function handleGoogleCallback()
    {
        // Pastikan config services.google juga diset sebelum callback
        config([
            'services.google.client_id' => env('GOOGLE_CLIENT_ID'),
            'services.google.client_secret' => env('GOOGLE_CLIENT_SECRET'),
            'services.google.redirect' => env('GOOGLE_REDIRECT_URL'),
        ]);

        try {
            // Coba ambil user via stateless (direkomendasikan untuk SPA)
            try {
                $googleUser = Socialite::driver('google')->stateless()->user();
            } catch (InvalidStateException $ise) {
                Log::warning('InvalidStateException on stateless Google callback: '.$ise->getMessage());
                $googleUser = Socialite::driver('google')->user();
            }

            if (!$googleUser || !$googleUser->getEmail()) {
                Log::error('Google callback missing email', ['google_user' => $googleUser]);
                return response()->json([
                    'error' => 'Tidak menerima email dari Google. Pastikan scope email/profile diatur.'
                ], 500);
            }

            // cek koneksi DB dulu agar error lebih informatif jika DB down / config salah
            try {
                DB::connection()->getPdo();
            } catch (Throwable $dbEx) {
                Log::error('Database connection failed during Google callback: '.$dbEx->getMessage(), ['exception' => $dbEx]);
                return response()->json([
                    'error' => 'Database connection failed',
                    'detail' => $dbEx->getMessage(),
                    'hint' => 'Periksa layanan database (MySQL) sedang berjalan, dan cek DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD di .env. Setelah memperbaiki, jalankan: php artisan config:clear && php artisan config:cache'
                ], 500);
            }

            // lakukan operasi DB (safe try/catch)
            try {
                $user = User::where('email', $googleUser->getEmail())->first();

                if (!$user) {
                    $user = User::create([
                        'name' => $googleUser->getName() ?? $googleUser->getNickname() ?? 'User',
                        'email' => $googleUser->getEmail(),
                        'is_verified' => true,
                        'email_verified_at' => now(),
                        'password' => Hash::make(uniqid()),
                        'role' => 'user',
                    ]);
                } else {
                    if (!$user->is_verified) {
                        $user->update(['is_verified' => true, 'email_verified_at' => now()]);
                    }
                }
            } catch (QueryException $qe) {
                Log::error('Database query error during Google callback: '.$qe->getMessage(), ['exception' => $qe]);
                return response()->json([
                    'error' => 'Database query error',
                    'detail' => $qe->getMessage(),
                    'hint' => 'Periksa koneksi DB dan struktur tabel users'
                ], 500);
            }

            // buat token
            try {
                $token = $user->createToken('api_token')->plainTextToken;
            } catch (Throwable $e) {
                Log::error('Failed to create token for user: '.$e->getMessage(), ['exception' => $e]);
                return response()->json([
                    'error' => 'Gagal membuat token',
                    'detail' => $e->getMessage(),
                ], 500);
            }

            // redirect ke frontend root dengan token sebagai query param (langsung ke /?token=...)
            $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');
            $redirectTo = $frontendUrl . '/?token=' . urlencode($token);

            Log::info('Google login successful, redirecting to frontend', ['redirect_to' => $redirectTo, 'user_id' => $user->id]);

            // fallback HTML (meta refresh + JS) to ensure browser redirect
            $html = <<<HTML
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="refresh" content="0;url={$redirectTo}">
  <script>window.location.replace("{$redirectTo}");</script>
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to frontend... If you are not redirected, <a href="{$redirectTo}">click here</a>.</p>
</body>
</html>
HTML;

            return response($html, 302)->header('Content-Type', 'text/html');
        } catch (Throwable $e) {
            Log::error('Google callback error: '.$e->getMessage(), ['exception' => $e]);
            return response()->json([
                'error' => 'Gagal login dengan Google',
                'detail' => $e->getMessage(),
                'hint' => 'Periksa storage/logs/laravel.log untuk stacktrace'
            ], 500);
        }
    }

    // ====================== ADMIN - LIST USER ======================
    public function listUsers(Request $request)
    {
        $admin = $request->user();
        if (!$admin || ($admin->role ?? 'user') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $q = $request->query('q');
        $includeAdmin = $request->boolean('include_admin', false);

        $query = User::query()
            ->select('id','name','email','role','is_verified','is_active','profile_image','created_at');

        if (!$includeAdmin) {
            $query->where('role', '!=', 'admin');
        }

        if ($q) {
            $query->where(function ($sub) use ($q) {
                $sub->where('name','like',"%{$q}%")
                    ->orWhere('email','like',"%{$q}%")
                    ->orWhere('role','like',"%{$q}%");
            });
        }

        $users = $query->orderBy('created_at','desc')->get();

        return response()->json(['users' => $users]);
    }

    // ====================== ADMIN - SET USER STATUS ======================
    public function setUserStatus(Request $request, $id)
    {
        $admin = $request->user();
        if (!$admin || ($admin->role ?? 'user') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'is_active' => 'required|boolean',
        ]);

        if ((int)$admin->id === (int)$id) {
            return response()->json(['message' => 'Tidak dapat mengubah status akun sendiri'], 422);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User tidak ditemukan'], 404);
        }
        if (($user->role ?? 'user') === 'admin') {
            return response()->json(['message' => 'Tidak dapat mengubah status akun admin'], 422);
        }

        $user->is_active = (bool) $data['is_active'];
        $user->save();

        if ($user->is_active === false && method_exists($user, 'tokens')) {
            try { $user->tokens()->delete(); } catch (\Throwable $e) {}
        }

        return response()->json([
            'message' => 'Status user diperbarui',
            'user' => $user->fresh(['id','name','email','role','is_verified','is_active','profile_image','created_at'])
        ]);
    }

    // NEW: Kirim OTP lupa password ke verification_code + expiry two_factor_expires_at (30 menit)
    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email'
        ]);

        $user = \App\Models\User::where('email', $data['email'])->first();
        if ($user) {
            $code = (string) random_int(100000, 999999);
            $user->verification_code = $code;
            $user->two_factor_expires_at = now()->addMinutes(30);
            $user->save();

            try {
                Mail::raw("Kode OTP reset password Anda adalah: {$code}. Berlaku 30 menit.", function ($m) use ($user) {
                    $m->to($user->email)->subject('OTP Reset Password');
                });
            } catch (\Throwable $e) {
                // ignore mailing errors
            }
        }

        // Response generik demi keamanan
        return response()->json(['message' => 'Jika email terdaftar, kode OTP telah dikirim.']);
    }

    // UBAH: Reset password memakai verification_code + two_factor_expires_at
    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = \App\Models\User::where('email', $data['email'])->first();
        if (!$user) {
            return response()->json(['message' => 'User tidak ditemukan'], 404);
        }

        $valid = hash_equals((string) ($user->verification_code ?? ''), (string) $data['code']);
        $notExpired = $user->two_factor_expires_at && Carbon::parse($user->two_factor_expires_at)->gt(now());
        if (!$valid || !$notExpired) {
            return response()->json(['message' => 'Kode OTP tidak valid atau kedaluwarsa'], 422);
        }

        $user->password = Hash::make($data['new_password']);
        // Hapus OTP + expiry dan revoke token login aktif (opsional)
        $user->verification_code = null;
        $user->two_factor_expires_at = null;
        $user->save();
        try { $user->tokens()->delete(); } catch (\Throwable $e) {}

        return response()->json(['message' => 'Password berhasil direset. Silakan login kembali.']);
    }

    // NEW: verify captcha helper
    private function verifyCaptcha(Request $request): bool
    {
        $token = (string) $request->input('captcha_token', '');
        if (!$token) {
            return false;
        }

        // NOTE: sebaiknya pindah ke env('RECAPTCHA_SECRET')
        $secret = '6LfzwggsAAAAANIT_uI5A2BLatmZ-4lUwU_B7avl';
        try {
            $res = Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $request->ip(),
            ]);
            if (!$res->ok()) return false;
            $json = $res->json();
            return (bool)($json['success'] ?? false);
        } catch (\Throwable $e) {
            return false;
        }
    }
}