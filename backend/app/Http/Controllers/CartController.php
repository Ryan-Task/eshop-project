<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Cart;
use App\Models\Product; // NEW

class CartController extends Controller
{
    public function addToCart(Request $request)
    {
        $request->validate([
            'product_id' => 'required|integer',
            'quantity' => 'required|integer|min:1',
        ]);

        $user = $request->user();

        // NEW: cek produk dan stok
        $product = Product::find($request->product_id);
        if (!$product) {
            return response()->json(['message' => 'Produk tidak ditemukan'], 404);
        }
        $current = Cart::where('user_id', $user->id)
            ->where('product_id', $request->product_id)
            ->first();
        $newQty = (int)($current?->quantity ?? 0) + (int)$request->quantity;

        if ((int)$product->stock <= 0) {
            return response()->json(['message' => 'Stok habis'], 422);
        }
        if ($newQty > (int)$product->stock) {
            return response()->json([
                'message' => 'Stok tidak cukup. Maksimal ' . (int)$product->stock . ' unit.',
                'max' => (int)$product->stock,
            ], 422);
        }

        // Cek apakah produk sudah ada di keranjang
        if ($current) {
            $current->quantity = $newQty;
            $current->save();
        } else {
            Cart::create([
                'user_id' => $user->id,
                'product_id' => $request->product_id,
                'quantity' => (int)$request->quantity,
            ]);
        }

        return response()->json(['message' => 'Produk berhasil ditambahkan ke keranjang']);
    }

    public function getCart(Request $request)
    {
        $user = $request->user();
        $cartItems = Cart::with('product')->where('user_id', $user->id)->get();
        return response()->json($cartItems);
    }

    public function removeFromCart($id)
    {
        $user = request()->user();

        $cartItem = $user->cart()->where('id', $id)->first();

        if (!$cartItem) {
            return response()->json(['message' => 'Item tidak ditemukan'], 404);
        }

        $cartItem->delete();

        return response()->json(['message' => 'Item berhasil dihapus']);
    }

    public function updateQuantity(Request $request, $id)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $user = $request->user();
        $cartItem = Cart::where('user_id', $user->id)
            ->where('id', $id)
            ->with('product') // NEW
            ->first();

        if (!$cartItem) {
            return response()->json(['message' => 'Item tidak ditemukan'], 404);
        }

        // NEW: validasi stok
        $stock = (int)($cartItem->product?->stock ?? 0);
        if ($stock <= 0) {
            return response()->json(['message' => 'Stok habis'], 422);
        }
        if ((int)$request->quantity > $stock) {
            return response()->json([
                'message' => 'Stok tidak cukup. Maksimal ' . $stock . ' unit.',
                'max' => $stock,
            ], 422);
        }

        $cartItem->quantity = (int)$request->quantity;
        $cartItem->save();

        return response()->json(['message' => 'Quantity berhasil diperbarui']);
    }
}