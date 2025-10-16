<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        DB::table('products')->insert([
            // HP
            [
                'name' => 'Samsung Galaxy S24',
                'type' => 'HP',
                'stock' => 12,
                'harga_modal' => 16000000,
                'price' => 19000000,
                'description' => 'Smartphone flagship dengan layar Dynamic AMOLED 2X dan kamera 200MP.',
                'image' => 'hp.jpg',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'iPhone 15 Pro Max',
                'type' => 'HP',
                'stock' => 10,
                'harga_modal' => 23000000,
                'price' => 27000000,
                'description' => 'Smartphone premium dengan chip A17 Pro dan desain titanium.',
                'image' => 'hp.jpg',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Xiaomi 14 Ultra',
                'type' => 'HP',
                'stock' => 15,
                'harga_modal' => 13000000,
                'price' => 16000000,
                'description' => 'HP flagship dengan kamera Leica dan performa Snapdragon 8 Gen 3.',
                'image' => 'hp.jpg',
                'created_at' => $now,
                'updated_at' => $now,
            ],

            // Laptop
            [
                'name' => 'Asus ROG Zephyrus G14',
                'type' => 'Laptop',
                'stock' => 8,
                'harga_modal' => 24000000,
                'price' => 28000000,
                'description' => 'Laptop gaming ringan dengan AMD Ryzen 9 dan RTX 4070.',
                'image' => 'laptop.jpg',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'MacBook Air M3',
                'type' => 'Laptop',
                'stock' => 10,
                'harga_modal' => 19000000,
                'price' => 23000000,
                'description' => 'Laptop tipis dan cepat dengan chip Apple M3 dan baterai tahan lama.',
                'image' => 'laptop.jpg',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Lenovo Legion 7i',
                'type' => 'Laptop',
                'stock' => 6,
                'harga_modal' => 31000000,
                'price' => 35000000,
                'description' => 'Laptop gaming kelas atas dengan Intel i9 dan RTX 4080.',
                'image' => 'laptop.jpg',
                'created_at' => $now,
                'updated_at' => $now,
            ],

            // Tablet
            [
                'name' => 'iPad Pro M2',
                'type' => 'Tablet',
                'stock' => 9,
                'harga_modal' => 16000000,
                'price' => 19000000,
                'description' => 'Tablet performa tinggi dengan chip Apple M2 dan layar Liquid Retina XDR.',
                'image' => 'tablet.jpg',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Samsung Galaxy Tab S9 Ultra',
                'type' => 'Tablet',
                'stock' => 7,
                'harga_modal' => 15000000,
                'price' => 18000000,
                'description' => 'Tablet Android premium dengan layar AMOLED 14.6 inci dan S Pen.',
                'image' => 'tablet.jpg',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Xiaomi Pad 6 Pro',
                'type' => 'Tablet',
                'stock' => 11,
                'harga_modal' => 7000000,
                'price' => 9000000,
                'description' => 'Tablet dengan Snapdragon 8+ Gen 1 dan layar 144Hz.',
                'image' => 'tablet.jpg',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}