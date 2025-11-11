<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Cart;
use Midtrans\Config;
use Midtrans\Snap;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MidtransController extends Controller
{
    public function __construct()
    {
        // ✅ Konfigurasi Midtrans (dengan fallback ke env)
        Config::$serverKey = config('midtrans.server_key') ?? config('services.midtrans.serverKey') ?? env('MIDTRANS_SERVER_KEY');
        Config::$isProduction = (bool) (config('midtrans.is_production') ?? config('services.midtrans.isProduction', false) ?? env('MIDTRANS_IS_PRODUCTION', false));
        Config::$isSanitized = true;
        Config::$is3ds = true;
    }

    /**
     * 🧾 Proses checkout dan buat transaksi Midtrans
     */
    public function checkout(Request $request)
    {
        $user = $request->user();

        if (empty(Config::$serverKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Midtrans server key belum dikonfigurasi. Set MIDTRANS_SERVER_KEY di .env.',
            ], 422);
        }

        // ⛔ Validasi alamat hanya untuk checkout baru (bukan re-pay)
        if (!$request->filled('order_id')) {
            $addressRaw = $user->address ?? null;
            $valid = false;
            if (is_array($addressRaw)) {
                $a = $addressRaw;
            } else {
                $a = json_decode((string) $addressRaw, true);
            }
            if (is_array($a)) {
                $valid = !empty($a['province']) && !empty($a['regency']) && !empty($a['district']) && !empty($a['detail']);
            } else {
                // jika format lama berupa string biasa, anggap valid jika tidak kosong
                $valid = !empty($addressRaw);
            }
            if (!$valid) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lengkapi alamat pengiriman pada profil terlebih dahulu.',
                ], 422);
            }
        }

        // ✅ Re-pay flow: gunakan order yang sudah ada (status pending)
        if ($request->filled('order_id')) {
            try {
                $order = Order::where('id', $request->input('order_id'))
                    ->where('user_id', $user->id)
                    ->first();

                if (!$order) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Order tidak ditemukan',
                    ], 404);
                }

                if ($order->status !== 'pending') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Order tidak dalam status pending',
                    ], 422);
                }

                $orderItems = OrderItem::where('order_id', $order->id)
                    ->with('product')
                    ->get();

                if ($orderItems->isEmpty()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Item order kosong',
                    ], 422);
                }

                $itemDetails = [];
                $total = 0;
                foreach ($orderItems as $item) {
                    $price = (int) $item->price;
                    $qty = (int) $item->quantity;
                    $total += $price * $qty;
                    $itemDetails[] = [
                        'id' => (string) $item->product_id,
                        'price' => $price,
                        'quantity' => $qty,
                        'name' => $item->product->name ?? ('Product ' . $item->product_id),
                    ];
                }
                if ($total <= 0) {
                    $total = (int) $order->total_price;
                }

                // Gunakan order_id unik untuk Midtrans (hindari duplikat dari percobaan sebelumnya)
                $midtransOrderId = 'ORDER-' . $order->id . '-RETRY-' . time();

                $params = [
                    'transaction_details' => [
                        'order_id' => $midtransOrderId,
                        'gross_amount' => (int) $total,
                    ],
                    'customer_details' => [
                        'first_name' => $user->name,
                        'email' => $user->email,
                    ],
                    'item_details' => $itemDetails,
                    // ✅ Tambahkan BCA VA dan DANA untuk simulasi
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

                $snapToken = Snap::getSnapToken($params);

                return response()->json([
                    'success' => true,
                    'message' => 'Token Midtrans berhasil dibuat (retry)',
                    'snap_token' => $snapToken,
                    'order_id' => $order->id,
                    'total' => $total,
                ]);
            } catch (\Throwable $e) {
                Log::error('Midtrans re-pay error', ['user_id' => $user->id, 'error' => $e->getMessage()]);
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal membuat transaksi (retry): ' . $e->getMessage(),
                ], 500);
            }
        }

        // ✅ New checkout flow: buat order dari cart
        // Ambil semua item keranjang
        $cartItems = Cart::where('user_id', $user->id)->with('product')->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Keranjang kosong'], 400);
        }
        if ($cartItems->contains(fn ($i) => !$i->product)) {
            return response()->json(['message' => 'Produk tidak ditemukan pada salah satu item keranjang'], 400);
        }

        try {
            // Jalankan dalam transaksi agar rollback jika gagal mendapatkan Snap Token
            [$order, $snapToken] = DB::transaction(function () use ($user, $request, $cartItems) {
                $total = 0;
                $itemDetails = [];

                foreach ($cartItems as $item) {
                    $price = (int) $item->product->price;
                    $qty = (int) $item->quantity;
                    $total += $price * $qty;

                    $itemDetails[] = [
                        'id' => (string) $item->product->id,
                        'price' => $price,
                        'quantity' => $qty,
                        'name' => $item->product->name,
                    ];
                }

                // NEW: Shipping (optional) dari request
                $shippingCost = (int) $request->input('shipping_cost', 0);
                $shippingMethod = $request->input('shipping_method');
                $buyerNote = $request->input('buyer_note');

                if ($shippingCost > 0) {
                    $itemDetails[] = [
                        'id' => 'SHIPPING',
                        'price' => $shippingCost,
                        'quantity' => 1,
                        'name' => 'Biaya Pengiriman',
                    ];
                    $total += $shippingCost;
                }

                if ($total <= 0) {
                    throw new \RuntimeException('Total pesanan tidak valid.');
                }

                $order = Order::create([
                    'user_id' => $user->id,
                    'total_price' => $total, // sudah termasuk ongkir bila ada
                    'status' => 'pending',
                ]);

                foreach ($cartItems as $item) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'price' => $item->product->price,
                    ]);
                }

                // Simpan catatan pengiriman awal (metode + catatan pembeli) ke shipping_note
                if ($shippingMethod || $buyerNote) {
                    $noteParts = [];
                    if ($shippingMethod) $noteParts[] = 'Metode: ' . $shippingMethod;
                    if ($buyerNote) $noteParts[] = 'Catatan: ' . $buyerNote;
                    $order->shipping_note = implode(' | ', $noteParts);
                    $order->save();
                }

                $params = [
                    'transaction_details' => [
                        'order_id' => 'ORDER-' . $order->id,
                        'gross_amount' => (int) $order->total_price,
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

                // 🔧 Buat Snap Token Midtrans (jika gagal -> throw -> rollback)
                $snapToken = Snap::getSnapToken($params);

                // Hapus cart setelah token berhasil dibuat
                Cart::where('user_id', $user->id)->delete();

                return [$order, $snapToken];
            });

            return response()->json([
                'success' => true,
                'message' => 'Token Midtrans berhasil dibuat',
                'snap_token' => $snapToken,
                'order_id' => $order->id,
                'total' => $order->total_price,
            ]);
        } catch (\Throwable $e) {
            Log::error('Midtrans checkout error', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat transaksi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 🧩 (Opsional) Update status order manual dari frontend setelah bayar
     */
    public function updateStatus(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer|exists:orders,id',
            'status' => 'required|string',
        ]);

        $order = Order::find($request->order_id);
        $order->status = $request->status;
        $order->save();

        return response()->json([
            'success' => true,
            'message' => 'Status pesanan diperbarui',
            'order' => $order,
        ]);
    }
}