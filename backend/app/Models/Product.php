<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'stock',
        'price',
        'description',
        'image',
        'harga_modal',
        'rating_count',
        'rating_average',
        'sold_count',
        'is_archived',
    ];

    protected $casts = [
        'price' => 'float',
        'harga_modal' => 'float',
        'stock' => 'integer',
        'rating_count' => 'integer',
        'rating_average' => 'float',
        'sold_count' => 'integer',
        'is_archived' => 'boolean',
    ];
}