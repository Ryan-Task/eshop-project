<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UpcomingProduct extends Model
{
    protected $fillable = [
        'name',
        'type',
        'release_at',
        'description',
        'price_estimate',
        'teaser_image',
    ];

    protected $casts = [
        'release_at' => 'datetime',
        'price_estimate' => 'float',
    ];
}
