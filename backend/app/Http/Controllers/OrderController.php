<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Midtrans\Config;
use Midtrans\Snap;
use Carbon\Carbon;

class OrderController extends Controller
{
    public function __construct()
    {
        // Konfigurasi Midtrans (Sandbox Mode) + fallback ke env/services
        Config::$serverKey = config('midtrans.server_key') ?? config('services.midtrans.serverKey') ?? env('MIDTRANS_SERVER_KEY');
        Config::$isProduction = false; // Sandbox
        Config::$isSanitized = true;
        Config::$is3ds = true;
    }

    /**
     * Proses checkout + generate Snap Token
     */
    public function store(Request $request)
    {
        $user = $request->user();

        // Ambil semua item dari cart user
        $cartItems = Cart::where('user_id', $user->id)->with('product')->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Keranjang kosong'], 400);
        }

        // Hitung total harga
        $total = 0;
        $itemDetails = [];
        foreach ($cartItems as $item) {
            $price = $item->product->price;
            $quantity = $item->quantity;
            $subtotal = $price * $quantity;

            $total += $subtotal;

            $itemDetails[] = [
                'id' => $item->product->id,
                'price' => $price,
                'quantity' => $quantity,
                'name' => $item->product->name,
            ];
        }

        // Pastikan gross_amount integer
        $total = (int) $total;

        // Generate unique Order ID untuk Midtrans
        $orderId = 'ORDER-' . time();

        // Buat parameter untuk Midtrans Snap
        $params = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $total,
            ],
            'customer_details' => [
                'first_name' => $user->name,
                'email' => $user->email,
            ],
            'item_details' => $itemDetails,
            'enabled_payments' => [
                'bca_va',      // BCA Virtual Account (simulasi)
                'dana',        // DANA E-Wallet (simulasi)
                'gopay',       // GoPay
                'shopeepay',   // ShopeePay
                'bank_transfer', // Transfer bank umum
                'bni_va',      // BNI VA
                'bri_va',      // BRI VA
                'permata_va',  // Permata VA
                'other_va',    // VA lainnya
            ],
            // ✅ PERBAIKAN: Pastikan semua callback ke /pages/payment/...
            'callbacks' => [
                'finish'   => 'http://localhost:3000/pages/payment/success',
                'unfinish' => 'http://localhost:3000/pages/payment/pending',  // ✅ FIX: /pages/
                'error'    => 'http://localhost:3000/pages/payment/failed',
            ],
        ];

        // Buat Snap Token
        $snapToken = Snap::getSnapToken($params);

        // Simpan order ke database (status masih pending)
        $order = DB::transaction(function () use ($user, $cartItems, $total, $orderId) {
            $order = Order::create([
                'user_id' => $user->id,
                'status' => 'pending',
                'total_price' => $total,
            ]);

            foreach ($cartItems as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'price' => $item->product->price,
                ]);
            }

            // Kosongkan cart setelah checkout
            Cart::where('user_id', $user->id)->delete();

            return $order;
        });

        return response()->json([
            'message' => 'Checkout berhasil',
            'order_id' => $orderId,
            'snap_token' => $snapToken,
        ]);
    }

    /**
     * Update status order (setelah sukses bayar)
     * - Ini dipanggil dari frontend Midtrans onSuccess() atau dari halaman success via query
     */
    public function updateStatus(Request $request)
    {
        $rawOrderId = $request->input('order_id');
        $statusInput = $request->input('status'); // optional: 'paid' | 'pending' | 'failed' | 'expired'
        $transactionStatus = $request->input('transaction_status'); // optional dari Midtrans: settlement/capture/pending/deny/cancel/expire

        // Ekstrak ID order asli dari format Midtrans: ORDER-{id} atau ORDER-{id}-RETRY-...
        $dbId = null;
        if (is_numeric($rawOrderId)) {
            $dbId = (int) $rawOrderId;
        } elseif (is_string($rawOrderId) && preg_match('/ORDER-(\d+)/i', $rawOrderId, $m)) {
            $dbId = (int) $m[1];
        }

        if (!$dbId) {
            return response()->json(['message' => 'Order ID tidak valid'], 422);
        }

        $order = Order::where('id', $dbId)->first();
        if (!$order) {
            return response()->json(['message' => 'Order tidak ditemukan'], 404);
        }

        // Jika sudah paid, jangan override
        if ($order->status === 'paid') {
            return response()->json(['message' => 'Order sudah dibayar', 'order' => $order]);
        }

        // Tentukan status final
        $mapped = $statusInput ?? $this->mapMidtransStatus($transactionStatus) ?? 'paid';

        $order->status = $mapped;
        $order->save();

        return response()->json(['message' => 'Status order diperbarui', 'order' => $order]);
    }

    /**
     * Ambil semua order milik user
     */
    public function index(Request $request) 
    {
        return Order::with('items.product')
            ->where('user_id', $request->user()->id)
            ->get();
    }

    /**
     * Ambil satu order user yang statusnya pending (untuk halaman pending)
     */
    public function getPendingOrder(Request $request)
    {
        // ✅ Hanya ambil order pending yang dibuat kurang dari 24 jam yang lalu
        $orders = Order::with('items.product')
            ->where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->where('created_at', '>', Carbon::now()->subHours(24)) // ✅ Filter expired
            ->latest()
            ->get();

        return response()->json(['orders' => $orders]);
    }

    // Map status dari Midtrans ke status internal
    private function mapMidtransStatus(?string $s): ?string
    {
        if (!$s) return null;
        $s = strtolower($s);
        return match ($s) {
            'capture', 'settlement', 'success' => 'paid',
            'pending' => 'pending',
            'deny', 'cancel', 'failure' => 'failed',
            'expire', 'expired' => 'expired',
            default => null,
        };
    }
}