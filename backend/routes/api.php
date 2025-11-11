<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\MidtransController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\UpcomingProductController;
use App\Http\Controllers\AddressController;

// ===============================
// 🔐 AUTH
// ===============================
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/verify', [AuthController::class, 'verify']);
Route::post('/resend-verification', [AuthController::class, 'resendVerification']);
Route::post('/2fa/verify', [AuthController::class, 'verifyTwoFactor']);

// NEW: Forgot password (OTP email)
Route::post('/password/forgot', [AuthController::class, 'forgotPassword']);
Route::post('/password/reset', [AuthController::class, 'resetPassword']);

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

    // 👤 USER PROFILE UPDATE (alamat + foto)
    Route::post('/user/profile', [ProfileController::class, 'update']);
    // NEW: change password
    Route::post('/user/password', [ProfileController::class, 'changePassword']);

    // NEW: Admin - Users management (pindah ke AuthController)
    Route::get('/admin/users', [AuthController::class, 'listUsers']);
    Route::post('/admin/users/{id}/status', [AuthController::class, 'setUserStatus']);

    // 🛒 CART
    Route::post('/cart', [CartController::class, 'addToCart']);
    Route::get('/cart', [CartController::class, 'getCart']);
    Route::put('/cart/{id}', [CartController::class, 'updateQuantity']);
    Route::delete('/cart/{id}', [CartController::class, 'removeFromCart']);

    // 💳 MIDTRANS CHECKOUT (tanpa callback)
    Route::post('/midtrans/checkout', [OrderController::class, 'store']); // gunakan store yang robust

    // 🧾 ORDERS
    Route::post('/orders', [OrderController::class, 'store']); // checkout + midtrans token
    Route::post('/orders/update-status', [OrderController::class, 'updateStatus']); // update status setelah bayar
    Route::get('/orders', [OrderController::class, 'index']); // ambil semua order user

    // ⚡ PENDING ORDER (tambahan baru)
    Route::get('/orders/pending', [OrderController::class, 'getPendingOrder']); // ambil order yang masih pending

    // ⭐ RATE ORDER
    Route::post('/orders/{orderId}/rate', [OrderController::class, 'rate']);
    Route::post('/orders/{orderId}/confirm-delivered', [OrderController::class, 'userConfirmDelivery']); // NEW: konfirmasi diterima oleh user

    // 🔧 ADMIN: Pengiriman
    Route::get('/admin/shipping/orders', [OrderController::class, 'adminShippingOrders']);
    Route::post('/admin/shipping/orders/{orderId}/status', [OrderController::class, 'adminUpdateShipping']);

    // 🔧 ADMIN: Contact Us
    Route::get('/admin/contacts', [ContactController::class, 'index']);

    // 🔧 ADMIN: Upcoming Products
    Route::post('/upcoming-products', [UpcomingProductController::class, 'store']);
    Route::put('/upcoming-products/{id}', [UpcomingProductController::class, 'update']); // NEW
    Route::delete('/upcoming-products/{id}', [UpcomingProductController::class, 'destroy']); // NEW

    // 🚚 SHIPPING OPTIONS (dynamic by cart)
    Route::get('/shipping/options', [OrderController::class, 'shippingOptions']);

    // NEW: Review History
    Route::get('/orders/reviews', [OrderController::class, 'reviewHistory']);
    Route::delete('/orders/{orderId}/review', [OrderController::class, 'deleteReview']);
    Route::put('/orders/{orderId}/review', [OrderController::class, 'updateReview']); // NEW: update review (maks 3 bulan)

    // NEW: Addresses (multi-alamat per user)
    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::put('/addresses/{id}', [AddressController::class, 'update']);
    Route::delete('/addresses/{id}', [AddressController::class, 'destroy']);
    Route::post('/addresses/{id}/default', [AddressController::class, 'setDefault']);

    // NEW: Admin - Ringkasan order selesai (paid + delivered)
    Route::get('/admin/orders/completed', [OrderController::class, 'adminCompletedOrders']);

    // NEW: Admin - Ringkasan (harian, per-produk, metrik user)
    Route::get('/admin/summary', [OrderController::class, 'adminSummary']);
    // NEW: Export PDF ringkasan
    Route::get('/admin/summary/pdf', [OrderController::class, 'adminSummaryPdf']);
});

// ===============================
// 🛍️ PRODUCTS (tidak butuh login)
// ===============================
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/categories', [ProductController::class, 'categories']); // NEW
Route::post('/products', [ProductController::class, 'store']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);

// NEW: Contact Us (public) -> pakai controller
Route::post('/contacts', [ContactController::class, 'store']);

// NEW: Upcoming Products (public list)
Route::get('/upcoming-products', [UpcomingProductController::class, 'index']);

// NEW: Testimonials (public)
Route::get('/testimonials', [ProductController::class, 'testimonials']);

// NEW: archive/unarchive dibuat public untuk testing (tanpa token/role)
Route::post('/products/{id}/archive', [ProductController::class, 'archive']);
Route::post('/products/{id}/unarchive', [ProductController::class, 'unarchive']);