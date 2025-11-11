<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(AdminUserSeeder::class);
        $this->call(ProductSeeder::class);
        $this->call(UpcomingSeeder::class);
        
        // Catatan: Jalankan AdminUserSeeder terpisah:
        // php artisan db:seed --class=AdminUserSeeder
    }
}