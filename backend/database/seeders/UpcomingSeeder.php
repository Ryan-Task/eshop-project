<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UpcomingSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('upcoming_products')->insert([
            'name' => 'HP iPhone 15',
            'type' => 'Smartphone',
            'release_at' => now()->addMonth(),
            'description' => '',
            'price_estimate' => 0,
            'teaser_image' => 'images/iphone.jpeg',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}