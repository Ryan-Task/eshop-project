<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('role')->default('user');
            $table->string('email')->unique();
            $table->string('profile_image')->nullable(); // Tambahkan kolom foto profil ke tabel users
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->boolean('is_verified')->default(false); // ← Tambahan kolom status verifikasi
            $table->string('verification_code')->nullable(); // ← Tambahan kolom kode verifikasi
            $table->boolean('is_active')->default(true); // NEW: status aktif/nonaktif (ban)
            $table->boolean('two_factor_enabled')->default(false); // NEW: 2FA
            $table->string('two_factor_code')->nullable(); // NEW: 2FA
            $table->timestamp('two_factor_expires_at')->nullable(); // NEW: 2FA
            $table->string('phone')->nullable();              // NEW: nomor telepon
            $table->string('birth_place')->nullable();        // NEW: tempat lahir
            $table->date('birth_date')->nullable();           // NEW: tanggal lahir
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};