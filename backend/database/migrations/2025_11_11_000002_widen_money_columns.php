<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Lebarkan precision ke DECIMAL(15,2)
        DB::statement('ALTER TABLE orders MODIFY total_price DECIMAL(15,2) NOT NULL');
        // shipping_cost bisa null
        DB::statement('ALTER TABLE orders MODIFY shipping_cost DECIMAL(15,2) NULL');
        // Unit price pada order_items juga dilebarkan
        DB::statement('ALTER TABLE order_items MODIFY price DECIMAL(15,2) NOT NULL');
    }

    public function down(): void
    {
        // Kembalikan ke DECIMAL(10,2)
        DB::statement('ALTER TABLE orders MODIFY total_price DECIMAL(10,2) NOT NULL');
        DB::statement('ALTER TABLE orders MODIFY shipping_cost DECIMAL(10,2) NULL');
        DB::statement('ALTER TABLE order_items MODIFY price DECIMAL(10,2) NOT NULL');
    }
};
