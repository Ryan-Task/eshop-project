<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CleanupExpiredOrders extends Command
{
    /**
     * Nama dan signature command
     */
    protected $signature = 'orders:cleanup-expired';

    /**
     * Deskripsi command
     */
    protected $description = 'Hapus order pending yang sudah lebih dari 24 jam';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Memulai cleanup order pending yang expired...');

        // Ambil order pending yang dibuat lebih dari 24 jam yang lalu
        $expiredOrders = Order::where('status', 'pending')
            ->where('created_at', '<=', Carbon::now()->subHours(24))
            ->get();

        $deletedCount = 0;

        foreach ($expiredOrders as $order) {
            try {
                // Hapus order items terlebih dahulu
                OrderItem::where('order_id', $order->id)->delete();
                
                // Hapus order
                $order->delete();
                
                $deletedCount++;
                
                Log::info("Order #{$order->id} (expired) berhasil dihapus");
            } catch (\Exception $e) {
                Log::error("Gagal menghapus order #{$order->id}: " . $e->getMessage());
            }
        }

        $this->info("Cleanup selesai. Total order dihapus: {$deletedCount}");
        
        return Command::SUCCESS;
    }
}
