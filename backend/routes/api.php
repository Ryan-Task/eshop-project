<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;

// AUTH
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// ROUTE YANG BUTUH TOKEN
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // GET USER PROFILE
    Route::get('/user', function (Illuminate\Http\Request $request) {
        return response()->json($request->user());
    });

    // CART
    Route::post('/cart', [CartController::class, 'addToCart']);
    Route::get('/cart', [CartController::class, 'getCart']);
    Route::put('/cart/{id}', [CartController::class, 'updateQuantity']);
    Route::delete('/cart/{id}', [CartController::class, 'removeFromCart']);

    // ORDER (kalau nanti mau dipakai)
    // Route::post('/orders', [OrderController::class, 'store']);
});

// PRODUCTS (tidak butuh login untuk lihat produk)
Route::get('/products', [ProductController::class, 'index']);
Route::post('/products', [ProductController::class, 'store']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);