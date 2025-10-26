<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\MidtransController;
use Illuminate\Http\Request;

// ===============================
// 🔐 AUTH
// ===============================
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/verify', [AuthController::class, 'verify']);
Route::post('/resend-verification', [AuthController::class, 'resendVerification']);

Route::get('/auth/google', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);

// ===============================
// 🔍 VERIFY TOKEN
// ===============================
Route::middleware('auth:sanctum')->get('/verify-token', function (Request $request) {
    return response()->json([
        'message' => 'Token valid',
        'user' => $request->user(),
    ]);
});

// ===============================
// 🛡️ ROUTE YANG BUTUH TOKEN
// ===============================
Route::middleware('auth:sanctum')->group(function () {

    // 🔓 LOGOUT
    Route::post('/logout', [AuthController::class, 'logout']);

    // 👤 USER PROFILE
    Route::get('/user', function (Request $request) {
        return response()->json($request->user());
    });

    // 🛒 CART
    Route::post('/cart', [CartController::class, 'addToCart']);
    Route::get('/cart', [CartController::class, 'getCart']);
    Route::put('/cart/{id}', [CartController::class, 'updateQuantity']);
    Route::delete('/cart/{id}', [CartController::class, 'removeFromCart']);

    // 💳 MIDTRANS CHECKOUT (tanpa callback)
    Route::post('/midtrans/checkout', [MidtransController::class, 'checkout']);

    // 🧾 ORDERS
    Route::post('/orders', [OrderController::class, 'store']); // checkout + midtrans token
    Route::post('/orders/update-status', [OrderController::class, 'updateStatus']); // update status setelah bayar
    Route::get('/orders', [OrderController::class, 'index']); // ambil semua order user

    // ⚡ PENDING ORDER (tambahan baru)
    Route::get('/orders/pending', [OrderController::class, 'getPendingOrder']); // ambil order yang masih pending
});

// ===============================
// 🛍️ PRODUCTS (tidak butuh login)
// ===============================
Route::get('/products', [ProductController::class, 'index']);
Route::post('/products', [ProductController::class, 'store']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);