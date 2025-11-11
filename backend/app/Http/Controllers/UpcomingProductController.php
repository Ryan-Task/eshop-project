<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UpcomingProduct;

class UpcomingProductController extends Controller
{
    public function index()
    {
        return response()->json(
            UpcomingProduct::orderBy('release_at', 'asc')->get()
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || ($user->role ?? 'user') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|max:100',
            'release_at' => 'required|date',
            'description' => 'nullable|string',
            'price_estimate' => 'nullable|numeric',
            'teaser_image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('teaser_image')) {
            $data['teaser_image'] = $request->file('teaser_image')->store('upcoming', 'public');
        }

        $up = UpcomingProduct::create($data);

        return response()->json([
            'message' => 'Upcoming product created',
            'data' => $up,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || ($user->role ?? 'user') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|nullable|string|max:100',
            'release_at' => 'sometimes|required|date',
            'description' => 'sometimes|nullable|string',
            'price_estimate' => 'sometimes|nullable|numeric',
            'teaser_image' => 'sometimes|nullable|image|max:2048',
        ]);

        $up = UpcomingProduct::findOrFail($id);

        if ($request->hasFile('teaser_image')) {
            $data['teaser_image'] = $request->file('teaser_image')->store('upcoming', 'public');
        }

        $up->update($data);

        return response()->json([
            'message' => 'Upcoming product updated',
            'data' => $up->fresh(),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || ($user->role ?? 'user') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $up = UpcomingProduct::findOrFail($id);
        $up->delete();

        return response()->json(['message' => 'Upcoming product deleted']);
    }
}
