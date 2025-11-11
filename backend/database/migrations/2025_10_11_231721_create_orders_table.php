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
    Schema::create('orders', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('status')->default('pending');
        $table->string('shipping_status')->nullable();       // shipped | in_transit | delivered
        $table->text('shipping_note')->nullable();           // catatan kurir/metode/pesan pembeli
        $table->timestamp('shipping_updated_at')->nullable();// waktu update status pengiriman
        $table->unsignedTinyInteger('rating')->nullable();   // 1..5
        $table->text('review_comment')->nullable();          // NEW: komentar review order
        $table->decimal('total_price', 10, 2);
        $table->text('shipping_address')->nullable();        // NEW: snapshot alamat pengiriman (JSON/text)
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};