<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\UserAddress; // NEW
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Midtrans\Config;
use Midtrans\Snap;
use Carbon\Carbon;
use App\Models\User; // NEW: untuk metrik user
use Dompdf\Dompdf; // NEW

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
     * - Jika dikirim order_id: regenerate Snap token untuk order pending yang sudah ada
     * - Jika tanpa order_id: buat order dari cart user lalu generate Snap token
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();

            // REGENERATE TOKEN UNTUK ORDER PENDING
            $rawOrderId = $request->input('order_id');
            if ($rawOrderId) {
                // Ekstrak ID dari ORDER-{id} atau numeric id
                $dbId = null;
                if (is_numeric($rawOrderId)) {
                    $dbId = (int) $rawOrderId;
                } elseif (is_string($rawOrderId) && preg_match('/ORDER-(\d+)/i', $rawOrderId, $m)) {
                    $dbId = (int) $m[1];
                }

                $order = Order::with('items.product')
                    ->where('id', $dbId)
                    ->where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->first();

                if (!$order) {
                    return response()->json(['message' => 'Order tidak ditemukan atau tidak pending'], 404);
                }

                // Gunakan ORDER-{id}-RETRY-{timestamp} agar unik
                $orderIdStr = 'ORDER-' . $order->id . '-RETRY-' . time();
                $total = (int) $order->total_price;

                $itemDetails = [];
                foreach ($order->items as $it) {
                    $itemDetails[] = [
                        'id' => $it->product_id,
                        'price' => (int) $it->price,
                        'quantity' => (int) $it->quantity,
                        'name' => $it->product?->name ?? ('Product ' . $it->product_id),
                    ];
                }
                // NEW: tambahkan ongkir jika tersimpan di order
                if ((int)($order->shipping_cost ?? 0) > 0) {
                    $itemDetails[] = [
                        'id' => 'SHIPPING',
                        'price' => (int) $order->shipping_cost,
                        'quantity' => 1,
                        'name' => $order->shipping_method ?: 'Ongkos Kirim',
                    ];
                }

                $params = [
                    'transaction_details' => [
                        'order_id' => $orderIdStr,
                        'gross_amount' => $total,
                    ],
                    'customer_details' => [
                        'first_name' => $user->name,
                        'email' => $user->email,
                    ],
                    'item_details' => $itemDetails,
                    'enabled_payments' => [
                        'bca_va','dana','gopay','shopeepay',
                        'bank_transfer','bni_va','bri_va','permata_va','other_va',
                    ],
                    'callbacks' => [
                        'finish'   => 'http://localhost:3000/pages/payment/success',
                        'unfinish' => 'http://localhost:3000/pages/payment/pending',
                        'error'    => 'http://localhost:3000/pages/payment/failed',
                    ],
                ];

                try {
                    $snapToken = Snap::getSnapToken($params);
                } catch (\Throwable $e) {
                    Log::error('Midtrans snap error (regenerate): ' . $e->getMessage());
                    return response()->json([
                        'message' => 'Gagal membuat Snap Token',
                        'error' => app()->environment('local') ? $e->getMessage() : null,
                    ], 500);
                }

                return response()->json([
                    'message' => 'Snap token regenerated',
                    'order_id' => $orderIdStr,
                    'snap_token' => $snapToken,
                ]);
            }

            // CHECKOUT BARU DARI CART
            // NEW: validasi alamat dari user_addresses terlebih dahulu (address_id atau default), fallback ke users.address
            $addressId = $request->input('address_id');
            $chosenAddressForValidation = null;
            if ($addressId) {
                $chosenAddressForValidation = UserAddress::where('user_id', $user->id)->where('id', $addressId)->first();
            }
            if (!$chosenAddressForValidation) {
                $chosenAddressForValidation = UserAddress::where('user_id', $user->id)->where('is_default', true)->first();
            }

            $valid = false;
            if ($chosenAddressForValidation) {
                $valid = !empty($chosenAddressForValidation->province)
                    && !empty($chosenAddressForValidation->regency)
                    && !empty($chosenAddressForValidation->district)
                    && !empty($chosenAddressForValidation->detail);
            } else {
                // fallback: legacy users.address (JSON/string)
                $addressRaw = $user->address ?? null;
                if (is_array($addressRaw)) {
                    $a = $addressRaw;
                } else {
                    $a = json_decode((string) $addressRaw, true);
                }
                if (is_array($a)) {
                    $valid = !empty($a['province']) && !empty($a['regency']) && !empty($a['district']) && !empty($a['detail']);
                } else {
                    $valid = !empty($addressRaw);
                }
            }

            if (!$valid) {
                return response()->json([
                    'message' => 'Belum ada alamat. Tambahkan alamat terlebih dahulu.'
                ], 422);
            }

            // Ambil semua item dari cart user
            $cartItems = Cart::where('user_id', $user->id)->with('product')->get();
            if ($cartItems->isEmpty()) {
                return response()->json(['message' => 'Keranjang kosong'], 400);
            }

            // NEW: validasi stok terbaru sebelum membuat order
            foreach ($cartItems as $item) {
                $p = $item->product;
                if (!$p) {
                    return response()->json(['message' => 'Produk tidak ditemukan: ' . $item->product_id], 404);
                }
                $wanted = (int)$item->quantity;
                $stock = (int)$p->stock;
                if ($stock <= 0) {
                    return response()->json([
                        'message' => 'Stok habis untuk produk: ' . ($p->name ?? ('Produk ' . $p->id)),
                        'product_id' => (int)$p->id,
                        'code' => 'INSUFFICIENT_STOCK'
                    ], 422);
                }
                if ($wanted > $stock) {
                    return response()->json([
                        'message' => 'Stok tidak cukup untuk ' . ($p->name ?? ('Produk ' . $p->id)) . '. Stok tersedia: ' . $stock,
                        'product_id' => (int)$p->id,
                        'available' => $stock,
                        'requested' => $wanted,
                        'code' => 'INSUFFICIENT_STOCK'
                    ], 422);
                }
            }

            // SAFE shipping code compute (avoid exception if format salah)
            $shippingCost = (int) $request->input('shipping_cost', 0);
            $shippingMethod = $request->input('shipping_method', 'Ongkos Kirim');
            $shippingCode = $request->input('shipping_code');
            if ($shippingCode && is_string($shippingCode)) {
                try {
                    [$courier, $service] = array_pad(explode(':', $shippingCode, 2), 2, null);
                    $qtyTotal = (int) $cartItems->sum('quantity');
                    // tentukan alamat untuk region multiplier
                    $chosenAddressLookup = UserAddress::where('user_id', $user->id)->where('id', $request->input('address_id'))->first()
                        ?: UserAddress::where('user_id', $user->id)->where('is_default', true)->first();
                    $prov = $chosenAddressLookup->province ?? '';
                    $reg = $chosenAddressLookup->regency ?? '';
                    $dist = $chosenAddressLookup->district ?? '';
                    $computed = $this->computeShippingCostForCode($courier, $service, $qtyTotal, $prov, $reg, $dist);
                    if ($computed) {
                        $shippingCost = (int) $computed['cost'];
                        $shippingMethod = $computed['label'];
                    }
                } catch (\Throwable $ex) {
                    // ignore -> gunakan nilai dari client
                }
            }

            // Hitung total & siapkan itemDetails (tanpa side-effects)
            $total = 0;
            $itemDetails = [];
            foreach ($cartItems as $item) {
                $price = (int) $item->product->price;
                $qty = (int) $item->quantity;
                $total += $price * $qty;
                $itemDetails[] = [
                    'id' => $item->product->id,
                    'price' => $price,
                    'quantity' => $qty,
                    'name' => $item->product->name,
                ];
            }
            if ($shippingCost > 0) {
                $itemDetails[] = [
                    'id' => 'SHIPPING',
                    'price' => $shippingCost,
                    'quantity' => 1,
                    'name' => $shippingMethod,
                ];
                $total += $shippingCost;
            }
            $total = (int) $total;

            // TRANSAKSI: buat order + recheck cart kosong (race)
            try {
                [$order, $orderIdStr, $itemDetailsFinal, $totalFinal] = \DB::transaction(function () use ($user, $shippingCost, $shippingMethod, $itemDetails, $total, $request) {
                    $latestCart = Cart::where('user_id', $user->id)->with('product')->get();
                    if ($latestCart->isEmpty()) {
                        throw new \RuntimeException('Keranjang kosong saat proses (race)');
                    }

                    // Snapshot alamat aman
                    $addressId = $request->input('address_id');
                    $snapAddr = null;
                    if ($addressId) {
                        $pick = UserAddress::where('user_id', $user->id)->where('id', $addressId)->first();
                        if ($pick) {
                            $snapAddr = json_encode([
                                'province' => $pick->province ?? null,
                                'regency' => $pick->regency ?? null,
                                'district' => $pick->district ?? null,
                                'postal_code' => $pick->postal_code ?? null,
                                'detail' => $pick->detail ?? null,
                            ]);
                        }
                    }
                    if (!$snapAddr) {
                        $raw = $user->address;
                        $snapAddr = is_string($raw) ? $raw : json_encode($raw);
                    }

                    $order = Order::create([
                        'user_id' => $user->id,
                        'status' => 'pending',
                        // UBAH: simpan numerik (hindari string terformat)
                        'total_price' => (float) $total,
                        'shipping_cost' => (float) $shippingCost,
                        'shipping_method' => $shippingMethod,
                        'shipping_address' => $snapAddr,
                    ]);

                    foreach ($latestCart as $ci) {
                        OrderItem::create([
                            'order_id' => $order->id,
                            'product_id' => $ci->product_id,
                            'quantity' => $ci->quantity,
                            'price' => (int) $ci->product->price,
                        ]);
                    }

                    Cart::where('user_id', $user->id)->delete();

                    return [$order, 'ORDER-' . $order->id . '-' . time(), $itemDetails, $total];
                });
            } catch (\RuntimeException $rx) {
                return response()->json(['message' => $rx->getMessage()], 422);
            }

            // Midtrans params & Snap token
            $params = [
                'transaction_details' => [
                    'order_id' => $orderIdStr,
                    // pastikan integer sesuai dokumentasi Midtrans
                    'gross_amount' => (int) round($totalFinal),
                ],
                'customer_details' => [
                    'first_name' => $user->name,
                    'email' => $user->email,
                ],
                'item_details' => $itemDetailsFinal,
                'enabled_payments' => [
                    'bca_va','dana','gopay','shopeepay','bank_transfer',
                    'bni_va','bri_va','permata_va','other_va',
                ],
                'callbacks' => [
                    'finish' => 'http://localhost:3000/pages/payment/success',
                    'unfinish' => 'http://localhost:3000/pages/payment/pending',
                    'error' => 'http://localhost:3000/pages/payment/failed',
                ],
            ];

            try {
                $snapToken = \Midtrans\Snap::getSnapToken($params);
            } catch (\Throwable $e) {
                \Log::error('Midtrans snap error (checkout): '.$e->getMessage());
                return response()->json([
                    'message' => 'Gagal membuat Snap Token',
                    'error' => app()->environment('local') ? $e->getMessage() : null,
                ], 500);
            }

            return response()->json([
                'message' => 'Checkout berhasil',
                'order_id' => $orderIdStr,
                'snap_token' => $snapToken,
            ]);
        } catch (\Throwable $e) {
            \Log::error('Checkout fatal: '.$e->getMessage());
            return response()->json([
                'message' => 'Terjadi kesalahan saat checkout',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
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

        $mapped = $statusInput ?? $this->mapMidtransStatus($transactionStatus) ?? 'paid';

        // NEW: jika transisi ke paid, kurangi stok dan tambah sold_count
        if ($mapped === 'paid') {
            DB::transaction(function () use ($order) {
                $items = OrderItem::where('order_id', $order->id)->with('product')->get();
                foreach ($items as $item) {
                    $product = $item->product;
                    if (!$product) {
                        continue;
                    }
                    // Kurangi stok minimal 0
                    $newStock = max(0, (int)$product->stock - (int)$item->quantity);
                    $product->stock = $newStock;
                    // Tambah sold_count
                    $product->sold_count = (int)$product->sold_count + (int)$item->quantity;
                    $product->save();
                }
                $order->status = 'paid';
                $order->save();
            });

            return response()->json(['message' => 'Status order diperbarui', 'order' => $order->fresh()]);
        }

        // Non-paid transitions (pending/failed/expired)
        $order->status = $mapped;
        $order->save();

        return response()->json(['message' => 'Status order diperbarui', 'order' => $order]);
    }

    /**
     * Ambil semua order milik user (bisa difilter status)
     */
    public function index(Request $request) 
    {
        $query = Order::with('items.product')
            ->where('user_id', $request->user()->id);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return $query->get();
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

        // Tambahkan computed fallback jika data lama belum punya shipping_cost/method
        foreach ($orders as $o) {
            $subtotal = 0;
            foreach ($o->items as $it) {
                $subtotal += ((int)$it->price) * ((int)$it->quantity);
            }
            $computed = max(0, ((int)$o->total_price) - $subtotal);
            $o->setAttribute('computed_shipping_cost', $computed);
            if (!$o->shipping_method) {
                $o->setAttribute('shipping_method', $o->shipping_method ?? $o->shipping_note);
            }
            // NEW: fallback shipping_cost untuk data lama agar konsisten dengan frontend
            if ($o->shipping_cost === null) {
                $o->setAttribute('shipping_cost', $computed);
            }
        }

        return response()->json(['orders' => $orders]);
    }

    // ADMIN: Daftar order berstatus paid (siap/berlangsung pengiriman)
    public function adminShippingOrders(Request $request)
    {
        $orders = Order::with('items.product')
            ->where('status', 'paid')
            ->latest()
            ->get();

        return response()->json(['orders' => $orders]);
    }

    // ADMIN: Update status pengiriman (shipped | in_transit | delivered)
    public function adminUpdateShipping(Request $request, $orderId)
    {
        $data = $request->validate([
            'shipping_status' => ['required', Rule::in(['in_transit','delivered_admin'])],
            'shipping_note' => ['nullable','string'],
        ]);

        $order = Order::where('id', $orderId)->where('status', 'paid')->first();
        if (!$order) {
            return response()->json(['message' => 'Order tidak ditemukan atau belum paid'], 404);
        }

        // Jika sudah final delivered (user confirmed) tidak dapat diubah
        if ($order->shipping_status === 'delivered') {
            return response()->json(['message' => 'Order sudah dikonfirmasi pelanggan (delivered final).'], 422);
        }

        // Normalisasi legacy 'shipped' -> 'in_transit'
        if ($order->shipping_status === 'shipped') {
            $order->shipping_status = 'in_transit';
            $order->save();
        }

        // Sequence baru: null -> in_transit -> delivered_admin
        $steps = ['in_transit','delivered_admin','delivered']; // delivered hanya via userConfirmDelivery
        $current = $order->shipping_status; // null|in_transit|delivered_admin|delivered
        $currentIndex = $current ? array_search($current, $steps, true) : -1;
        $requestedIndex = array_search($data['shipping_status'], $steps, true);

        if ($requestedIndex !== $currentIndex + 1) {
            return response()->json([
                'message' => 'Transisi tidak valid. Urutan: (kosong) → in_transit → delivered_admin → delivered (konfirmasi user)'
            ], 422);
        }

        $order->shipping_status = $data['shipping_status'];
        $order->shipping_note = $data['shipping_note'] ?? null;
        $order->shipping_updated_at = now();
        $order->save();

        return response()->json(['message' => 'Status pengiriman diperbarui', 'order' => $order]);
    }

    /**
     * Simpan rating untuk order (1..5) dan rating per-produk pada order tsb.
     * Hanya boleh jika shipping_status = delivered dan belum pernah dirating.
     * Body:
     * {
     *   "rating": 5,
     *   "products": [{ "product_id": 123, "rating": 4 }, ...] // opsional
     * }
     */
    public function rate(Request $request, $orderId)
    {
        $user = $request->user();

        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string', // NEW: komentar review
            'products' => 'sometimes|array',
            'products.*.product_id' => 'required|integer',
            'products.*.rating' => 'required|integer|min:1|max:5',
        ]);

        $order = Order::with('items')->where('id', $orderId)->where('user_id', $user->id)->first();
        if (!$order) {
            return response()->json(['message' => 'Order tidak ditemukan'], 404);
        }

        // UBAH: wajib sudah delivered DAN sudah dikonfirmasi user
        if ($order->shipping_status !== 'delivered') {
            return response()->json(['message' => 'Order belum final delivered (menunggu konfirmasi user)'], 422);
        }
        if (is_null($order->customer_confirmed_at)) {
            return response()->json(['message' => 'User belum konfirmasi diterima'], 422);
        }

        DB::transaction(function () use ($order, $data) {
            // Simpan rating + komentar order
            $order->rating = (int) $data['rating'];
            $order->review_comment = $data['comment'] ?? null;
            $order->save();

            $affectedProductIds = [];

            // Rating per-produk (bila dikirim)
            $productRatings = collect($data['products'] ?? []);

            if ($productRatings->isNotEmpty()) {
                $itemsByProduct = $order->items->keyBy('product_id');

                foreach ($productRatings as $pr) {
                    $pid = (int) $pr['product_id'];
                    $rate = (int) $pr['rating'];

                    if (!$itemsByProduct->has($pid)) {
                        continue;
                    }
                    $item = $itemsByProduct->get($pid);
                    if (is_null($item->rating)) {
                        $item->rating = $rate;
                        $item->save();
                        $affectedProductIds[] = $pid;
                    }
                }
            } else {
                // TIDAK ada rating per-produk: isi rating order ke semua item yang belum punya rating
                foreach ($order->items as $item) {
                    if (is_null($item->rating)) {
                        $item->rating = (int) $order->rating;
                        $item->save();
                        $affectedProductIds[] = (int) $item->product_id;
                    }
                }
            }

            // Hitung ulang agregat rating produk untuk produk yang terdampak
            $affectedProductIds = array_values(array_unique($affectedProductIds));
            if (!empty($affectedProductIds)) {
                foreach ($affectedProductIds as $pid) {
                    $stats = OrderItem::where('product_id', $pid)
                        ->whereNotNull('rating')
                        ->selectRaw('COUNT(*) as cnt, AVG(rating) as avg_rating')
                        ->first();

                    $product = Product::find($pid);
                    if ($product && $stats) {
                        $product->rating_count = (int) ($stats->cnt ?? 0);
                        $product->rating_average = round((float) ($stats->avg_rating ?? 0), 2);
                        $product->save();
                    }
                }
            }
        });

        return response()->json(['message' => 'Penilaian tersimpan', 'order' => $order->fresh('items.product')]);
    }

    /**
     * NEW: Ambil history penilaian (order dengan rating tidak null)
     */
    public function reviewHistory(Request $request)
    {
        $orders = Order::with(['items.product:id,name,image', 'user:id,name'])
            ->where('user_id', $request->user()->id)
            ->whereNotNull('rating')
            ->latest()
            ->get();

        // Ubah: pakai updated_at order, dan jika ada, pakai timestamp rating item paling awal
        $now = Carbon::now();
        foreach ($orders as $o) {
            $base = $o->updated_at ? Carbon::parse($o->updated_at) : Carbon::parse($o->created_at);
            $firstItemRatingAt = null;
            if ($o->relationLoaded('items')) {
                // cari updated_at paling awal dari item yang punya rating
                $ts = $o->items->filter(fn($it) => !is_null($it->rating))->pluck('updated_at')->filter()->min();
                if ($ts) {
                    $firstItemRatingAt = Carbon::parse($ts);
                }
            }
            if ($firstItemRatingAt && $firstItemRatingAt->lt($base)) {
                $base = $firstItemRatingAt;
            }
            $deadline = (clone $base)->addMonthsNoOverflow(3);
            $o->setAttribute('can_edit', $now->lt($deadline));
            $o->setAttribute('edit_deadline', $deadline->toDateTimeString());
        }

        return response()->json(['orders' => $orders]);
    }

    /**
     * NEW: Update penilaian (maks 3 bulan setelah pertama kali review)
     * Body:
     * {
     *   "rating": 4,
     *   "comment": "optional",
     *   "products": [{ "product_id": 123, "rating": 5 }] // opsional: bila ingin set per-item
     * }
     */
    public function updateReview(Request $request, $orderId)
    {
        $user = $request->user();

        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
            'products' => 'sometimes|array',
            'products.*.product_id' => 'required|integer',
            'products.*.rating' => 'required|integer|min:1|max:5',
        ]);

        $order = Order::with('items')->where('id', $orderId)->where('user_id', $user->id)->first();
        if (!$order) {
            return response()->json(['message' => 'Order tidak ditemukan'], 404);
        }
        if (is_null($order->rating)) {
            return response()->json(['message' => 'Order belum memiliki penilaian'], 422);
        }

        // Validasi batas 3 bulan: gunakan updated_at order atau updated_at item rating paling awal
        $base = $order->updated_at ? Carbon::parse($order->updated_at) : Carbon::parse($order->created_at);
        $firstItemRatingAt = $order->items
            ->filter(fn($it) => !is_null($it->rating))
            ->pluck('updated_at')
            ->filter()
            ->min();
        if ($firstItemRatingAt) {
            $firstItemRatingAt = Carbon::parse($firstItemRatingAt);
            if ($firstItemRatingAt->lt($base)) {
                $base = $firstItemRatingAt;
            }
        }
        $deadline = (clone $base)->addMonthsNoOverflow(3);
        if (Carbon::now()->gte($deadline)) {
            return response()->json(['message' => 'Batas waktu ubah review telah lewat'], 422);
        }

        DB::transaction(function () use ($order, $data) {
            // Update rating + komentar; tidak menyentuh kolom rating_at
            $order->rating = (int) $data['rating'];
            $order->review_comment = $data['comment'] ?? $order->review_comment;
            $order->save();

            // Opsional: update per-produk sama seperti di rate()
            $affectedProductIds = [];
            $productRatings = collect($data['products'] ?? []);

            if ($productRatings->isNotEmpty()) {
                $itemsByProduct = $order->items->keyBy('product_id');
                foreach ($productRatings as $pr) {
                    $pid = (int) $pr['product_id'];
                    $rate = (int) $pr['rating'];
                    if (!$itemsByProduct->has($pid)) continue;
                    $item = $itemsByProduct->get($pid);
                    $item->rating = $rate;
                    $item->save();
                    $affectedProductIds[] = $pid;
                }
            } else {
                // Jika tidak ada array products: update semua item agar konsisten dengan rating order
                foreach ($order->items as $item) {
                    $item->rating = (int) $order->rating;
                    $item->save();
                    $affectedProductIds[] = (int) $item->product_id;
                }
            }

            // Recalc agregat rating untuk produk yang terdampak
            $affectedProductIds = array_values(array_unique($affectedProductIds));
            if (!empty($affectedProductIds)) {
                foreach ($affectedProductIds as $pid) {
                    $stats = OrderItem::where('product_id', $pid)
                        ->whereNotNull('rating')
                        ->selectRaw('COUNT(*) as cnt, AVG(rating) as avg_rating')
                        ->first();

                    $product = Product::find($pid);
                    if ($product) {
                        $product->rating_count = (int) ($stats->cnt ?? 0);
                        $product->rating_average = round((float) ($stats->avg_rating ?? 0), 2);
                        $product->save();
                    }
                }
            }
        });

        return response()->json(['message' => 'Review diperbarui']);
    }

    // NEW: Ringkasan admin (harian + per-produk + metrik user)
    public function adminSummary(Request $request)
    {
        $days = (int) $request->query('days', 30);
        $days = $days > 0 ? min($days, 365) : 30;
        $scope = strtolower((string) $request->query('scope', 'completed')); // completed|paid

        $from = Carbon::now()->startOfDay()->subDays($days - 1);
        $to   = Carbon::now()->endOfDay();

        // Ambil item dari order sesuai scope
        $items = OrderItem::with(['order:id,user_id,created_at,status,shipping_status','product:id,name,image,harga_modal'])
            ->whereHas('order', function ($q) use ($from, $to, $scope) {
                $q->whereBetween('created_at', [$from, $to])->where('status','paid');
                if ($scope === 'completed') {
                    $q->where('shipping_status','delivered');
                }
            })->get();

        // Seri harian
        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $dateKey = $from->copy()->addDays($i)->format('Y-m-d');
            $series[$dateKey] = [
                'date' => $dateKey,
                'revenue' => 0.0,
                'cost' => 0.0,
                'profit' => 0.0,
                'qty' => 0,
            ];
        }

        $totalRevenue = 0.0;
        $totalCost = 0.0;
        $totalQty = 0;

        // Group per produk
        $prodMap = []; // product_id => metrics

        foreach ($items as $it) {
            $dateKey = Carbon::parse($it->order->created_at)->format('Y-m-d');

            $qty = (int) $it->quantity;
            $rev = (float) $it->price * $qty;
            $costUnit = (float) ($it->product->harga_modal ?? 0);
            $cost = $costUnit * $qty;

            if (isset($series[$dateKey])) {
                $series[$dateKey]['revenue'] += $rev;
                $series[$dateKey]['cost'] += $cost;
                $series[$dateKey]['profit'] += ($rev - $cost);
                $series[$dateKey]['qty'] += $qty;
            }

            $totalRevenue += $rev;
            $totalCost += $cost;
            $totalQty += $qty;

            $pid = (int) $it->product_id;
            if (!isset($prodMap[$pid])) {
                $prodMap[$pid] = [
                    'product_id' => $pid,
                    'name' => $it->product->name ?? ('Produk ' . $pid),
                    'image' => $it->product->image ?? null,
                    'qty_sold' => 0,
                    'revenue' => 0.0,
                    'cost' => 0.0,
                    'rating_sum' => 0.0,
                    'rating_count' => 0,
                ];
            }
            $prodMap[$pid]['qty_sold'] += $qty;
            $prodMap[$pid]['revenue'] += $rev;
            $prodMap[$pid]['cost'] += $cost;

            // Ambil rating item jika ada (hanya dalam range)
            if (isset($it->rating) && $it->rating !== null) {
                $prodMap[$pid]['rating_sum'] += (float) $it->rating;
                $prodMap[$pid]['rating_count'] += 1;
            }
        }

        // Hitung per-produk + fallback rating_average dari produk jika belum ada rating item
        $products = [];
        foreach ($prodMap as $row) {
            $avg = 0.0;
            if ($row['rating_count'] > 0) {
                $avg = round($row['rating_sum'] / max(1, $row['rating_count']), 2);
            } else {
                // fallback global rating product (di luar range) bila tersedia
                $p = Product::find($row['product_id']);
                if ($p && $p->rating_average) {
                    $avg = (float) $p->rating_average;
                }
            }
            $products[] = [
                'product_id' => $row['product_id'],
                'name' => $row['name'],
                'image' => $row['image'],
                'qty_sold' => (int) $row['qty_sold'],
                'revenue' => (float) $row['revenue'],
                'cost' => (float) $row['cost'],
                'profit' => (float) ($row['revenue'] - $row['cost']),
                'rating_average' => (float) $avg,
            ];
        }
        // Urutkan per-produk by qty_sold desc
        usort($products, fn($a, $b) => $b['qty_sold'] <=> $a['qty_sold']);

        // Rata-rata rating toko (order.rating), hanya order selesai dalam rentang
        $avgStoreRating = (float) (Order::whereBetween('created_at', [$from, $to])
            ->where('status', 'paid')
            ->where('shipping_status', 'delivered')
            ->whereNotNull('rating')
            ->avg('rating') ?? 0);

        // Metrik user
        $newUsers = (int) User::whereBetween('created_at', [$from, $to])->count();

        // Siapkan data chart
        $ordered = array_values($series);
        $labels = array_map(fn($r) => $r['date'], $ordered);
        $dataProfit = array_map(fn($r) => (float) $r['profit'], $ordered);
        $dataQty = array_map(fn($r) => (int) $r['qty'], $ordered);

        return response()->json([
            'summary' => [
                'days' => $days,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'scope' => $scope,
                'revenue' => (float) $totalRevenue,
                'cost' => (float) $totalCost,
                'profit' => (float) ($totalRevenue - $totalCost),
                'qty_sold' => (int) $totalQty,
                'avg_store_rating' => round($avgStoreRating, 2),
                'new_users' => (int) $newUsers,
                'orders_completed' => (int) Order::whereBetween('created_at', [$from, $to])
                    ->where('status', 'paid')
                    ->where('shipping_status', 'delivered')
                    ->count(),
            ],
            'labels' => $labels,
            'data_profit' => $dataProfit,
            'data_qty' => $dataQty,
            'products' => $products,
        ]);
    }

    // NEW: Ringkasan order selesai per-order (paid + delivered) + profit per order
    public function adminCompletedOrders(Request $request)
    {
        $daysParam = $request->query('days', 30);
        $applyDate = true;
        if (is_string($daysParam) && strtolower($daysParam) === 'all') {
            $applyDate = false;
            $days = null;
        } else {
            $days = is_numeric($daysParam) ? (int) $daysParam : 30;
            $days = $days > 0 ? min($days, 365) : 30;
        }

        $from = $applyDate ? Carbon::now()->startOfDay()->subDays($days - 1) : null;
        $to   = $applyDate ? Carbon::now()->endOfDay() : null;

        $baseQuery = Order::with(['items.product:id,name,image,harga_modal','user:id,name'])
            ->where('status','paid')
            ->where('shipping_status','delivered'); // hanya yang sudah konfirmasi user

        if ($applyDate) {
            // Pakai tanggal delivered (shipping_updated_at) bila ada, fallback ke created_at
            $baseQuery->where(function ($q) use ($from, $to) {
                $q->whereBetween('shipping_updated_at', [$from, $to])
                  ->orWhere(function ($x) use ($from, $to) {
                      $x->whereNull('shipping_updated_at')
                        ->whereBetween('created_at', [$from, $to]);
                  });
            });
        }

        // Urutkan berdasarkan delivered_at (coalesce shipping_updated_at, created_at)
        $orders = $baseQuery
            ->orderByRaw('COALESCE(shipping_updated_at, created_at) DESC')
            ->get();

        // Fallback: jika hasil kosong dan ada filter tanggal, ambil semua delivered (hindari "data tidak ditemukan")
        if ($orders->isEmpty() && $applyDate) {
            $orders = Order::with([
                    'items.product:id,name,image,harga_modal',
                    'user:id,name'
                ])
                ->where('status', 'paid')
                ->where('shipping_status', 'delivered')
                ->orderByRaw('COALESCE(shipping_updated_at, created_at) DESC')
                ->get();
            $applyDate = false; // ringkasan akan menunjukkan "all"
        }

        $rows = [];
        $totalRevenue = 0.0;
        $totalCost = 0.0;
        $totalProfit = 0.0;

        foreach ($orders as $o) {
            $revenue = 0.0;
            $cost = 0.0;
            $qtyTotal = 0;

            $itemsPayload = [];
            foreach ($o->items as $it) {
                $lineRevenue = (float) $it->price * (int) $it->quantity;
                $lineCost = (float) ($it->product->harga_modal ?? 0) * (int) $it->quantity;
                $revenue += $lineRevenue;
                $cost += $lineCost;
                $qtyTotal += (int) $it->quantity;

                $itemsPayload[] = [
                    'id' => (int) $it->id,
                    'product_id' => (int) $it->product_id,
                    'name' => (string) ($it->product->name ?? ('Produk ' . $it->product_id)),
                    'image' => $it->product->image ?? null,
                    'quantity' => (int) $it->quantity,
                    'price' => (float) $it->price,
                    'subtotal' => (float) $lineRevenue,
                ];
            }

            $profit = $revenue - $cost;

            // NEW: ambil rating order (jika ada)
            $rating = is_null($o->rating) ? null : (int) $o->rating;
            $reviewComment = $o->review_comment ?? null;

            $rows[] = [
                'id' => (int) $o->id,
                'created_at' => optional($o->created_at)->toDateTimeString(),
                'delivered_at' => optional($o->shipping_updated_at ?? $o->created_at)->toDateTimeString(),
                'items_count' => (int) $qtyTotal,
                'total_price' => (float) $o->total_price,
                'shipping_cost' => (int) ($o->shipping_cost ?? 0),
                'shipping_method' => (string) ($o->shipping_method ?? ''),
                'revenue' => (float) $revenue,
                'cost' => (float) $cost,
                'profit' => (float) $profit,
                'customer' => $o->user?->name ?? null,
                'items' => $itemsPayload,
                // NEW
                'rating' => $rating,
                'review_comment' => $reviewComment,
            ];

            $totalRevenue += $revenue;
            $totalCost += $cost;
            $totalProfit += $profit;
        }

        // Ringkasan rentang (jika fallback all dipakai, tunjukkan seluruh periode)
        $summaryFrom = $applyDate ? $from->toDateString() : ($orders->last()?->created_at?->toDateString() ?? null);
        $summaryTo = $applyDate ? $to->toDateString() : ($orders->first()?->created_at?->toDateString() ?? null);

        return response()->json([
            'summary' => [
                'days' => $applyDate ? $days : 'all',
                'from' => $summaryFrom,
                'to' => $summaryTo,
                'orders_completed' => count($rows),
                'revenue' => (float) $totalRevenue,
                'cost' => (float) $totalCost,
                'profit' => (float) $totalProfit,
            ],
            'orders' => $rows,
        ]);
    }

    // NEW: Export PDF ringkasan admin
    public function adminSummaryPdf(Request $request)
    {
        $days = (int) $request->query('days', 30);
        $days = $days > 0 ? min($days, 365) : 30;
        $scope = strtolower((string) $request->query('scope', 'completed')); // completed|paid
        $group = strtolower((string) $request->query('group', 'day')); // day|week
        if (!in_array($group, ['day','week'], true)) $group = 'day';

        $from = \Carbon\Carbon::now()->startOfDay()->subDays($days - 1);
        $to   = \Carbon\Carbon::now()->endOfDay();

        // Ambil data ringkasan sama seperti adminSummary
        $items = \App\Models\OrderItem::with([
            'order:id,user_id,created_at,status,shipping_status',
            'product:id,name,image,harga_modal'
        ])->whereHas('order', function ($q) use ($from, $to, $scope) {
            $q->whereBetween('created_at', [$from, $to])->where('status', 'paid');
            if ($scope === 'completed') $q->where('shipping_status', 'delivered');
        })->get();

        // Agregasi total global
        $revenue = 0; $cost = 0; $qty = 0;
        foreach ($items as $it) {
            $qty += (int)$it->quantity;
            $rev = (float)$it->price * (int)$it->quantity;
            $cst = (float)($it->product->harga_modal ?? 0) * (int)$it->quantity;
            $revenue += $rev; $cost += $cst;
        }
        $profit = $revenue - $cost;
        $ordersCompleted = \App\Models\Order::whereBetween('created_at', [$from,$to])
            ->where('status','paid')
            ->where('shipping_status','delivered')
            ->count();
        $avgStoreRating = (float) (\App\Models\Order::whereBetween('created_at', [$from,$to])
            ->where('status','paid')->where('shipping_status','delivered')
            ->whereNotNull('rating')->avg('rating') ?? 0);
        $newUsers = (int) \App\Models\User::whereBetween('created_at', [$from,$to])->count();

        // Grouping per-hari/per-minggu
        $groups = []; // key => ['label'=>..., 'from'=>..., 'to'=>..., 'revenue'=>..., 'cost'=>..., 'qty'=>..., 'products'=>[pid=>...]]
        foreach ($items as $it) {
            $d = \Carbon\Carbon::parse($it->order->created_at);
            if ($group === 'week') {
                $start = (clone $d)->startOfWeek(\Carbon\Carbon::MONDAY);
                $end   = (clone $d)->endOfWeek(\Carbon\Carbon::SUNDAY);
                $key   = $start->toDateString() . '_' . $end->toDateString();
                $label = $start->format('d M Y') . ' – ' . $end->format('d M Y');
            } else {
                $key   = $d->format('Y-m-d');
                $label = $d->format('d M Y');
            }

            if (!isset($groups[$key])) {
                $groups[$key] = [
                    'label' => $label,
                    'from' => $group === 'week' ? $start->toDateString() : $d->toDateString(),
                    'to'   => $group === 'week' ? $end->toDateString()   : $d->toDateString(),
                    'revenue' => 0.0,
                    'cost' => 0.0,
                    'qty' => 0,
                    'products' => [], // product_id => ['name'=>..., 'qty'=>..., 'revenue'=>..., 'cost'=>..., 'order_ids'=>[]]
                ];
            }

            $lineQty = (int) $it->quantity;
            $lineRev = (float) $it->price * $lineQty;
            $lineCost = (float) ($it->product->harga_modal ?? 0) * $lineQty;

            $groups[$key]['qty']     += $lineQty;
            $groups[$key]['revenue'] += $lineRev;
            $groups[$key]['cost']    += $lineCost;

            $pid = (int) $it->product_id;
            if (!isset($groups[$key]['products'][$pid])) {
                $groups[$key]['products'][$pid] = [
                    'name' => $it->product->name ?? ('Produk ' . $pid),
                    'qty' => 0,
                    'revenue' => 0.0,
                    'cost' => 0.0,
                    'order_ids' => [], // NEW: kumpulkan ID order
                ];
            }
            $groups[$key]['products'][$pid]['qty']     += $lineQty;
            $groups[$key]['products'][$pid]['revenue'] += $lineRev;
            $groups[$key]['products'][$pid]['cost']    += $lineCost;

            // NEW: simpan order_id unik untuk produk ini pada grup hari/minggu ini
            $oid = (int) ($it->order_id ?? ($it->order?->id ?? 0));
            if ($oid && !in_array($oid, $groups[$key]['products'][$pid]['order_ids'], true)) {
                $groups[$key]['products'][$pid]['order_ids'][] = $oid;
            }
        }

        // Urutkan grup (ASC by date)
        ksort($groups);

        // Build HTML
        $css = "
            <style>
                body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color:#111; }
                h1 { font-size: 18px; margin: 0 0 4px 0; }
                h2 { font-size: 15px; margin: 16px 0 6px; }
                table { width:100%; border-collapse: collapse; margin-top: 6px; }
                th, td { border:1px solid #555; padding:6px; }
                th { background:#efefef; }
                .num { text-align:right; }
                .muted { color:#555; }
                .summary { margin-top:10px; }
                .small { font-size:10px; }
            </style>
        ";

        $header = "
            <h1>Ringkasan Penjualan (" . htmlspecialchars($scope) . ")</h1>
            <div class='small muted'>Periode: {$from->toDateString()} s/d {$to->toDateString()} ({$days} hari) • Grup: " . strtoupper($group) . "</div>
            <table class='summary'>
                <tr><th>Total Revenue</th><td class='num'>Rp " . number_format($revenue,0,',','.') . "</td></tr>
                <tr><th>Total Cost</th><td class='num'>Rp " . number_format($cost,0,',','.') . "</td></tr>
                <tr><th>Total Profit</th><td class='num'>Rp " . number_format($profit,0,',','.') . "</td></tr>
                <tr><th>Qty Sold</th><td class='num'>" . number_format($qty,0,',','.') . "</td></tr>
                <tr><th>Orders Completed</th><td class='num'>" . number_format($ordersCompleted,0,',','.') . "</td></tr>
                <tr><th>Avg Store Rating</th><td class='num'>" . number_format(round($avgStoreRating,2),2,',','.') . "</td></tr>
                <tr><th>New Users</th><td class='num'>" . number_format($newUsers,0,',','.') . "</td></tr>
            </table>
        ";

        $body = "";
        foreach ($groups as $g) {
            $gProfit = (float)$g['revenue'] - (float)$g['cost'];

            // Ubah daftar produk ke array dan urutkan qty desc
            $prods = array_values($g['products']);
            usort($prods, function($a,$b){ return ($b['qty'] <=> $a['qty']); });

            // Batasi 30 baris per grup agar PDF tetap ringan
            $prods = array_slice($prods, 0, 30);

            $rows = "";
            foreach ($prods as $p) {
                $pProfit = (float)$p['revenue'] - (float)$p['cost'];

                // NEW: tampilkan daftar order di bawah nama produk
                $nameCell = htmlspecialchars($p['name']);
                if (!empty($p['order_ids'])) {
                    sort($p['order_ids']);
                    $ordersStr = 'Orders: ' . implode(', ', array_map(function ($id) {
                        return '#' . (int)$id;
                    }, $p['order_ids']));
                    $nameCell .= "<div class='small muted'>{$ordersStr}</div>";
                }

                $rows .= "
                    <tr>
                        <td>{$nameCell}</td>
                        <td class='num'>".number_format($p['qty'],0,',','.')."</td>
                        <td class='num'>Rp ".number_format($p['revenue'],0,',','.')."</td>
                        <td class='num'>Rp ".number_format($p['cost'],0,',','.')."</td>
                        <td class='num'>Rp ".number_format($pProfit,0,',','.')."</td>
                    </tr>
                ";
            }

            $body .= "
                <h2>".htmlspecialchars($g['label'])."</h2>
                <table>
                    <tr>
                        <th style='width:45%'>Produk</th>
                        <th style='width:10%'>Qty</th>
                        <th style='width:20%'>Revenue</th>
                        <th style='width:20%'>Cost</th>
                        <th style='width:20%'>Profit</th>
                    </tr>
                    $rows
                </table>
            ";
        }

        $html = "
            {$css}
            <body>
                {$header}
                {$body}
            </body>
        ";

        // Generate PDF
        $dompdf = new Dompdf();
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        // Output to browser
        $filename = "ringkasan_penjualan_{$scope}_{$days}hari_" . date('YmdHis') . ".pdf";
        return $dompdf->stream($filename, [
            'Attachment' => true,
        ]);
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

    // =========================
    // Helpers (NEW)
    // =========================

    // Centralized shipping matrix
    private function shippingMatrix(): array
    {
        return [
            // courier, service, label, eta, base, perItem
            ['jne',     'REG',     'JNE Reguler',     '2-4 hari', 12000, 6000],
            ['jne',     'YES',     'JNE YES',         '1-2 hari', 18000, 9000],
            ['jnt',     'EZ',      'J&T EZ',          '2-4 hari', 13000, 6500],
            ['sicepat', 'REG',     'SiCepat Reg',     '2-4 hari', 12000, 6000],
            ['anteraja','REG',     'Anteraja Reg',    '2-4 hari', 11000, 5500],
            ['pos',     'KILAT',   'POS Kilat',       '2-5 hari', 10000, 5000],
            ['instant', 'INSTANT', 'Kurir Instan',    '≤ 3 jam',  25000, 10000],
        ];
    }

    // Normalize user->address (string JSON or array) into array
    private function normalizeAddress($raw): array
    {
        if (is_array($raw)) return $raw;
        $a = json_decode((string) $raw, true);
        return is_array($a) ? $a : ['raw' => $raw];
    }

    // Multiplier based on province/regency (rough island-distance heuristic)
    private function regionMultiplier(?string $province, ?string $regency): float
    {
        $p = strtolower((string)$province);
        $r = strtolower((string)$regency);

        // Default Jawa perkotaan
        $mult = 1.0;

        // Jabodetabek dan kota besar
        if (preg_match('/(dki|jakarta|depok|bekasi|bogor|tangerang|bandung|surabaya|semarang|yogyakarta)/', $p . ' ' . $r)) {
            $mult = 1.0;
        }
        // Jawa non-kota besar
        elseif (preg_match('/(jawa|banten)/', $p)) {
            $mult = 1.1;
        }
        // Bali/NTB sedikit lebih mahal
        elseif (preg_match('/(bali|ntb|nusa tenggara barat)/', $p)) {
            $mult = 1.2;
        }
        // Sumatera/Kalimantan/Sulawesi
        elseif (preg_match('/(sumatera|kalimantan|sulawesi|kepri|bangka|belitung|aceh|riau|jambi|bengkulu|lampung|sumatera utara|sumatera barat|sumatera selatan|kalimantan barat|kalimantan timur|kalimantan selatan|kalimantan tengah|kalimantan utara|sulawesi utara|sulawesi tengah|sulawesi selatan|sulawesi tenggara|gorontalo)/', $p)) {
            $mult = 1.3;
        }
        // NTT/Maluku/Papua
        elseif (preg_match('/(ntt|nusa tenggara timur|maluku|papua)/', $p)) {
            $mult = 1.5;
        }

        // Remote regency hints
        if (preg_match('/(kepulauan|pulau|archipelago|selatan barat daya|utara timur)/', $r)) {
            $mult += 0.1;
        }

        return (float) $mult;
    }

    // Remote surcharge (flat) for very remote islands
    private function remoteSurcharge(?string $province, ?string $district): int
    {
        $p = strtolower((string)$province);
        $d = strtolower((string)$district);

        $remoteIslands = preg_match('/(papua|maluku|maluku utara|ntt|nusa tenggara timur)/', $p) ? 10000 : 0;
        $isIsland = preg_match('/(kep\.|kepulauan|pulau)/', $p . ' ' . $d) ? 5000 : 0;

        return (int) ($remoteIslands + $isIsland);
    }

    // Compute cost for a matrix row with address influence
    private function computeShippingCost(string $courier, string $service, string $label, string $eta, int $base, int $perItem, int $qtyTotal, string $province, string $regency, string $district): array
    {
        $extraUnits = max(0, $qtyTotal - 1);
        $raw = $base + ($perItem * $extraUnits);
        $mult = $this->regionMultiplier($province, $regency);
        $surcharge = $this->remoteSurcharge($province, $district);

        $cost = (int) ceil($raw * $mult) + $surcharge;

        // Minimums for specific services
        if ($courier === 'instant') {
            $cost = max($cost, 25000);
        }

        return [
            'cost' => $cost,
            'label' => $label,
            'eta' => $eta,
        ];
    }

    // Compute by code for checkout override
    private function computeShippingCostForCode(?string $courier, ?string $service, int $qtyTotal, string $province, string $regency, string $district): ?array
    {
        if (!$courier || !$service) return null;
        foreach ($this->shippingMatrix() as $row) {
            [$c, $s, $label, $eta, $base, $perItem] = $row;
            if (strtolower($c) === strtolower($courier) && strtolower($s) === strtolower($service)) {
                return $this->computeShippingCost($c, $s, $label, $eta, (int)$base, (int)$perItem, $qtyTotal, $province, $regency, $district);
            }
        }
        return null;
    }

    // NEW: Konfirmasi diterima oleh user (ubah ke delivered)
    public function userConfirmDelivery(Request $request, $orderId)
    {
        $user = $request->user();
        $order = Order::where('id', $orderId)
            ->where('user_id', $user->id)
            ->where('status', 'paid')
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order tidak ditemukan'], 404);
        }
        if ($order->shipping_status !== 'delivered_admin') {
            return response()->json(['message' => 'Order belum pada tahap menunggu konfirmasi user'], 422);
        }
        if (!is_null($order->customer_confirmed_at)) {
            return response()->json(['message' => 'Sudah dikonfirmasi sebelumnya', 'order' => $order]);
        }

        $order->customer_confirmed_at = now();
        $order->shipping_status = 'delivered'; // final
        $order->shipping_updated_at = now();
        $order->save();

        return response()->json(['message' => 'Konfirmasi diterima. Terima kasih!', 'order' => $order]);
    }

    // NEW: opsi pengiriman dinamis (dipakai di halaman checkout)
    public function shippingOptions(Request $request)
    {
        $user = $request->user();

        // Ambil alamat terpilih (id) atau default
        $addr = null;
        if ($request->filled('address_id')) {
            $addr = UserAddress::where('user_id', $user->id)->where('id', $request->input('address_id'))->first();
        }
        if (!$addr) {
            $addr = UserAddress::where('user_id', $user->id)->where('is_default', true)->first();
        }

        // Hitung total qty dari cart
        $cart = Cart::where('user_id', $user->id)->with('product')->get();
        $qtyTotal = (int) $cart->sum('quantity');

        $province = (string) ($addr->province ?? '');
        $regency  = (string) ($addr->regency ?? '');
        $district = (string) ($addr->district ?? '');

        $options = [];
        foreach ($this->shippingMatrix() as $row) {
            [$courier, $service, $label, $eta, $base, $perItem] = $row;
            $calc = $this->computeShippingCost($courier, $service, $label, $eta, (int)$base, (int)$perItem, max(1, $qtyTotal), $province, $regency, $district);
            $options[] = [
                'code' => strtoupper($courier.'_'.$service),
                'courier' => $courier,
                'service' => $service,
                'name' => $label,
                'eta' => $calc['eta'],
                'cost' => (int) $calc['cost'],
            ];
        }

        return response()->json(['options' => $options]);
    }
}