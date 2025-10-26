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
        'email_verified_at'

    ];

    protected $hidden = [
        'password',
        'remember_token',
        'verification_code',

    ];

    public function cart()
    {
        return $this->hasMany(\App\Models\Cart::class, 'user_id');
    }
}