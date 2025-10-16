<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Cart;

class CartController extends Controller
{
    public function addToCart(Request $request)
    {
        $request->validate([
            'product_id' => 'required|integer',
            'quantity' => 'required|integer|min:1',
        ]);

        $user = $request->user();

        // Cek apakah produk sudah ada di keranjang
        $cart = Cart::where('user_id', $user->id)
            ->where('product_id', $request->product_id)
            ->first();

        if ($cart) {
            $cart->quantity += $request->quantity;
            $cart->save();
        } else {
            Cart::create([
                'user_id' => $user->id,
                'product_id' => $request->product_id,
                'quantity' => $request->quantity,
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
        $cartItem = Cart::where('user_id', $user->id)->where('id', $id)->first();

        if (!$cartItem) {
            return response()->json(['message' => 'Item tidak ditemukan'], 404);
        }

        $cartItem->quantity = $request->quantity;
        $cartItem->save();

        return response()->json(['message' => 'Quantity berhasil diperbarui']);
    }
}