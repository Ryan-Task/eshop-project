<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens; // ← Tambahkan ini
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable; // ← Tambahkan HasApiTokens di sini

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_verified',
        'verification_code',
        'email_verified_at',
        'address',
        'profile_image',
        'is_active', // Tambahkan is_active di sini
        // NEW: 2FA fields
        'two_factor_enabled',
        'two_factor_code',
        'two_factor_expires_at',
        'phone','birth_place','birth_date', // NEW
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'verification_code',

    ];

    protected $casts = [
        'is_active' => 'boolean', // Tambahkan cast untuk is_active
        'is_verified' => 'boolean',
        'email_verified_at' => 'datetime',
        // NEW: 2FA cast
        'two_factor_enabled' => 'boolean',
        'two_factor_expires_at' => 'datetime',
        'birth_date' => 'date', // NEW
    ];

    public function cart()
    {
        return $this->hasMany(\App\Models\Cart::class, 'user_id');
    }
}