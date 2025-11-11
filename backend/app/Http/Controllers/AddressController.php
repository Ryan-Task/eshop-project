<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserAddress;

class AddressController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $addresses = UserAddress::where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();

        return response()->json(['addresses' => $addresses]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'province' => 'required|string|max:255',
            'regency' => 'required|string|max:255',
            'district' => 'required|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'detail' => 'required|string',
            'is_default' => 'sometimes|boolean',
        ]);

        $hasAny = UserAddress::where('user_id', $user->id)->exists();
        $isDefault = (bool)($data['is_default'] ?? (!$hasAny));

        if ($isDefault) {
            UserAddress::where('user_id', $user->id)->update(['is_default' => false]);
        }

        $addr = UserAddress::create([
            'user_id' => $user->id,
            'province' => $data['province'] ?? null,
            'regency' => $data['regency'] ?? null,
            'district' => $data['district'] ?? null,
            'postal_code' => $data['postal_code'] ?? null,
            'detail' => $data['detail'] ?? null,
            'is_default' => $isDefault,
        ]);

        return response()->json(['message' => 'Alamat tersimpan', 'address' => $addr], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $addr = UserAddress::where('user_id', $user->id)->where('id', $id)->first();
        if (!$addr) return response()->json(['message' => 'Alamat tidak ditemukan'], 404);

        $data = $request->validate([
            'province' => 'sometimes|required|string|max:255',
            'regency' => 'sometimes|required|string|max:255',
            'district' => 'sometimes|required|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'detail' => 'sometimes|required|string',
            'is_default' => 'sometimes|boolean',
        ]);

        if (array_key_exists('is_default', $data) && $data['is_default']) {
            UserAddress::where('user_id', $user->id)->update(['is_default' => false]);
            $addr->is_default = true;
        }

        $addr->fill($data);
        $addr->save();

        return response()->json(['message' => 'Alamat diperbarui', 'address' => $addr]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $addr = UserAddress::where('user_id', $user->id)->where('id', $id)->first();
        if (!$addr) return response()->json(['message' => 'Alamat tidak ditemukan'], 404);

        $wasDefault = $addr->is_default;
        $addr->delete();

        if ($wasDefault) {
            $next = UserAddress::where('user_id', $user->id)->orderByDesc('id')->first();
            if ($next) {
                $next->is_default = true;
                $next->save();
            }
        }

        return response()->json(['message' => 'Alamat dihapus']);
    }

    public function setDefault(Request $request, $id)
    {
        $user = $request->user();
        $addr = UserAddress::where('user_id', $user->id)->where('id', $id)->first();
        if (!$addr) return response()->json(['message' => 'Alamat tidak ditemukan'], 404);

        UserAddress::where('user_id', $user->id)->update(['is_default' => false]);
        $addr->is_default = true;
        $addr->save();

        return response()->json(['message' => 'Alamat default diset', 'address' => $addr]);
    }
}
