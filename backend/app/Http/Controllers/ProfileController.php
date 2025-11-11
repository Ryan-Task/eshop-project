<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255', // allow changing name
            'address' => 'nullable|string',
            'profile_image' => 'nullable|image|max:2048',
            'two_factor_enabled' => 'sometimes|boolean', // toggle 2FA
            'phone' => 'sometimes|nullable|string|max:20',       // NEW
            'birth_place' => 'sometimes|nullable|string|max:100',// NEW
            'birth_date' => 'sometimes|nullable|date',           // NEW
        ]);

        if ($request->hasFile('profile_image')) {
            $path = $request->file('profile_image')->store('profiles', 'public');
            $data['profile_image'] = $path;
        }

        // if disabling 2FA, clear pending codes
        if (array_key_exists('two_factor_enabled', $data) && !$data['two_factor_enabled']) {
            $user->two_factor_code = null;
            $user->two_factor_expires_at = null;
        }

        $user->update($data);

        return response()->json($user->fresh());
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => 'nullable|string', // boleh kosong untuk akun terverifikasi (mis. Google)
            'new_password' => 'required|string|min:8|confirmed', // expects new_password_confirmation
        ]);

        // Jika user mengisi current_password -> jalankan verifikasi biasa
        if (!empty($data['current_password'])) {
            if (!Hash::check($data['current_password'], $user->password)) {
                return response()->json(['message' => 'Password saat ini salah'], 422);
            }
            if (Hash::check($data['new_password'], $user->password)) {
                return response()->json(['message' => 'Password baru tidak boleh sama dengan password lama'], 422);
            }
        } else {
            // current_password tidak dikirim:
            // Izinkan hanya jika user sudah terverifikasi (aman untuk akun Google yang tidak punya password awal)
            $isVerified = !is_null($user->email_verified_at) || (bool)($user->is_verified ?? false);
            if (!$isVerified) {
                return response()->json(['message' => 'Akun belum terverifikasi. Harap verifikasi email atau isi password saat ini.'], 422);
            }
        }

        $user->password = Hash::make($data['new_password']);
        $user->save();

        return response()->json(['message' => 'Password berhasil diperbarui']);
    }
}