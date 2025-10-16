<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type');
            $table->integer('stock')->default(0);
            $table->decimal('price', 15, 2);
             $table->text('description')->nullable();
            $table->decimal('harga_modal', 15, 2); // ← kolom baru harga modal
            $table->string('image')->nullable(); // path gambar
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};