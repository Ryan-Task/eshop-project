<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Illuminate\Database\QueryException;
use Throwable;
use App\Models\User;

class AuthController extends Controller
{
    // ====================== REGISTER ======================
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email',
            'password' => 'required|string|min:6',
        ]);

        $existingUser = User::where('email', $request->email)->first();

        if ($existingUser && $existingUser->is_verified) {
            return response()->json(['message' => 'Email sudah terdaftar dan diverifikasi'], 422);
        }

        if ($existingUser && !$existingUser->is_verified) {
            $verificationCode = rand(100000, 999999);
            $existingUser->update([
                'name' => $request->name,
                'password' => Hash::make($request->password),
                'verification_code' => $verificationCode,
                'is_verified' => false,
            ]);

            try {
                Mail::raw("Kode verifikasi akun Anda adalah: {$verificationCode}", function ($message) use ($existingUser) {
                    $message->to($existingUser->email)
                            ->subject('Kode Verifikasi Akun Anda');
                });
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Gagal mengirim email verifikasi',
                    'error' => $e->getMessage()
                ], 500);
            }

            return response()->json([
                'message' => 'Email sudah terdaftar tapi belum diverifikasi. Kode baru dikirim ke email Anda.',
                'user' => $existingUser,
            ]);
        }

        // Buat user baru dan langsung login otomatis
        $verificationCode = rand(100000, 999999);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'user',
            'verification_code' => $verificationCode,
            'is_verified' => true,
            'email_verified_at' => now(),
        ]);

        try {
            Mail::raw("Selamat datang, {$user->name}! Akun Anda telah berhasil dibuat.", function ($message) use ($user) {
                $message->to($user->email)->subject('Selamat Datang di Website Kami');
            });
        } catch (\Exception $e) {
            // Abaikan jika gagal kirim email sambutan
        }

        $token = $user->createToken('api_token')->plainTextToken;

        return response()->json([
            'message' => 'Registrasi berhasil dan login otomatis.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    // ====================== VERIFIKASI EMAIL ======================
    public function verify(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'verification_code' => 'required'
        ]);

        $user = User::where('email', $request->email)
                    ->where('verification_code', $request->verification_code)
                    ->first();

        if (!$user) {
            return response()->json(['message' => 'Kode verifikasi salah atau email tidak ditemukan'], 400);
        }

        $user->update([
            'is_verified' => true,
            'email_verified_at' => now(),
            'verification_code' => null
        ]);

        $token = $user->createToken('api_token')->plainTextToken;

        return response()->json([
            'message' => 'Email berhasil diverifikasi dan login otomatis.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    // ====================== LOGIN MANUAL ======================
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Email atau password salah'], 401);
        }

        $user = Auth::user();

        if (!$user->is_verified) {
            Auth::logout();
            return response()->json(['message' => 'Akun belum diverifikasi.'], 403);
        }

        $token = $user->createToken('api_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'user' => $user,
            'token' => $token,
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
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Email tidak ditemukan'], 404);
        }

        if ($user->is_verified) {
            return response()->json(['message' => 'Akun sudah diverifikasi'], 400);
        }

        $verificationCode = rand(100000, 999999);
        $user->update(['verification_code' => $verificationCode]);

        try {
            Mail::raw("Kode verifikasi baru Anda adalah: {$verificationCode}", function ($message) use ($user) {
                $message->to($user->email)->subject('Kode Verifikasi Baru Akun Anda');
            });
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal mengirim ulang email verifikasi',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json(['message' => 'Kode verifikasi baru telah dikirim ke email Anda.']);
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
}