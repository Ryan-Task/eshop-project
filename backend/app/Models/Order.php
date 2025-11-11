<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'status', 'total_price',
        'shipping_cost', 'shipping_method',
        'shipping_address',
        'customer_confirmed_at',
    ];

    protected $casts = [
        'total_price' => 'float',
        'shipping_cost' => 'float',
        'customer_confirmed_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}