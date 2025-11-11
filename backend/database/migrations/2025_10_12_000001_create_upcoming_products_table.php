<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('upcoming_products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->nullable();
            $table->dateTime('release_at');             // tanggal rilis
            $table->text('description')->nullable();
            $table->decimal('price_estimate', 15, 2)->nullable();
            $table->string('teaser_image')->nullable(); // disimpan di storage/public/upcoming
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('upcoming_products');
    }
};
