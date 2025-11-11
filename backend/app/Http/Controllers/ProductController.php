<?php 
 namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\OrderItem;
use App\Models\Order;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query();

        // Filter berdasarkan kategori jika ada
        if ($request->has('category') && $request->category !== 'all') {
            $query->where('type', $request->category);
        } elseif ($request->has('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        // NEW: exclude archived by default (include_archived=1 untuk melihat semua)
        if (!$request->boolean('include_archived')) {
            $query->where(function ($q) {
                $q->whereNull('is_archived')->orWhere('is_archived', false);
            });
        }

        // NEW: admin_list payload (kolom khusus untuk tabel admin)
        if ($request->boolean('admin_list')) {
            $query->select([
                'id','name','type','stock','harga_modal','price',
                'image','is_archived'
            ]);
        } elseif ($request->boolean('minimal')) {
            $query->select([
                'id','name','type','price','stock',
                'image','rating_count','rating_average','sold_count'
            ]);
        }

        $products = $query->get();

        // NEW: inject thumb_image bila ?thumb=1
        if ($request->boolean('thumb')) {
            $products->transform(function ($p) {
                if (!$p->image) {
                    $p->thumb_image = null;
                    return $p;
                }
                $path = $p->image; // ex: products/abc.jpg
                $base = basename($path);
                $thumbPath = 'products/thumbs/' . $base;
                // cek apakah file thumb ada
                if (\Storage::disk('public')->exists($thumbPath)) {
                    $p->thumb_image = $thumbPath;
                } else {
                    $p->thumb_image = $path;
                }
                return $p;
            });
        }

        return response()->json($products);
    }

    // Endpoint untuk ambil semua kategori unik (pakai kolom 'type' agar cocok dengan DB)
    public function categories()
    {
        $categories = Product::select('type')
            ->distinct()
            ->pluck('type');

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'type' => 'required|string',
            'stock' => 'required|integer',
            'price' => 'required|numeric',
            'description' => 'sometimes|nullable|string',
            'harga_modal' => 'required|numeric',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        $product = Product::create($data);
        return response()->json($product, 201);
    }

    public function show($id)
    {
        $product = Product::findOrFail($id);

        // Ambil review item (yang punya rating) + komentar dari order terkait (jika ada)
        $items = OrderItem::where('product_id', $id)
            ->whereNotNull('rating')
            ->with(['product'])
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        // Ambil komentar dari orders untuk item-item tersebut (opsional)
        $orderIds = OrderItem::where('product_id', $id)
            ->pluck('order_id')
            ->unique()
            ->values();

        $ordersMap = Order::whereIn('id', $orderIds)
            ->get(['id', 'review_comment', 'created_at', 'shipping_status'])
            ->keyBy('id');

        $reviews = $items->map(function ($it) use ($ordersMap) {
            $ord = $ordersMap->get($it->order_id);
            return [
                'rating' => (int)$it->rating,
                'comment' => $ord?->review_comment,
                'date' => optional($ord?->created_at)->toDateTimeString(),
                'shipping_status' => $ord?->shipping_status,
            ];
        })->values();

        return response()->json([
            'id' => $product->id,
            'name' => $product->name,
            'type' => $product->type,
            'stock' => (int)$product->stock,
            'price' => (float)$product->price,
            'description' => $product->description,
            'image' => $product->image,
            'harga_modal' => (float)$product->harga_modal,
            'rating_count' => (int)($product->rating_count ?? 0),
            'rating_average' => (float)($product->rating_average ?? 0),
            'sold_count' => (int)($product->sold_count ?? 0),
            'reviews' => $reviews, // daftar review
            'created_at' => $product->created_at,
            'updated_at' => $product->updated_at,
    ]);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|required|string',
            'type' => 'sometimes|required|string',
            'stock' => 'sometimes|required|integer',
            'price' => 'sometimes|required|numeric',
            'description' => 'sometimes|nullable|string',
            'harga_modal' => 'sometimes|required|numeric', 
            'image' => 'nullable|image|max:2048',
            // NEW: optional toggle from update too
            'is_archived' => 'sometimes|boolean',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        $product->update($data);
        return response()->json($product);
    }

    // NEW: hapus produk (hard delete)
    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();
        return response()->json(['message' => 'Product deleted']);
    }

    // NEW: Archive product (tanpa cek role untuk testing)
    public function archive(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $product->is_archived = true;
        $product->save();

        return response()->json(['message' => 'Product archived', 'product' => $product]);
    }

    // NEW: Unarchive product (tanpa cek role untuk testing)
    public function unarchive(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $product->is_archived = false;
        $product->save();

        return response()->json(['message' => 'Product unarchived', 'product' => $product]);
    }

    /**
     * Ambil semua testimonial dari rating order-level (review pribadi), hanya rating > 3
     */
    public function testimonials()
    {
        $orders = Order::whereNotNull('rating')
            ->where('rating', '>', 3) // hanya diatas bintang 3
            ->with([
                'user:id,name',
                'items.product:id,name,image',
            ])
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        $testimonials = $orders->map(function ($order) {
            $firstItem = $order->items->first();
            return [
                'id' => (int) $order->id,
                'rating' => (int) $order->rating,
                'comment' => (string) ($order->review_comment ?? ''),
                'user_name' => $order->user?->name ?? 'Anonymous',
                'product_name' => $firstItem?->product?->name,
                'product_image' => $firstItem?->product?->image,
                'date' => optional($order->created_at)->toDateTimeString(),
            ];
        })->values();

        return response()->json($testimonials);
    }
}