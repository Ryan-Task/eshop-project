"use client";

import { useEffect, useState } from "react";
import api from "../../api/api";
import { motion } from "framer-motion";
import Image from "next/image";

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk mendapatkan URL gambar
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/images/placeholder.jpg";

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    if (imagePath.startsWith("storage/")) {
      return `http://127.0.0.1:8000/${imagePath}`;
    }

    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCart(res.data);
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      const token = localStorage.getItem("token");
      await api.post(
        "/orders",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Pesanan berhasil dibuat!");
      fetchCart();
      // Trigger cart update di navbar
      window.dispatchEvent(new Event("cartChange"));
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("Terjadi kesalahan saat checkout");
    }
  };

  const handleRemove = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/cart/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCart();
      // Trigger cart update di navbar
      window.dispatchEvent(new Event("cartChange"));
    } catch (error) {
      console.error("Error removing item:", error);
      alert("Terjadi kesalahan saat menghapus item");
    }
  };

  const handleQuantityChange = async (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const token = localStorage.getItem("token");
      await api.put(
        `/cart/${id}`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCart();
      window.dispatchEvent(new Event("cartChange"));
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((total: number, item: any) => {
      return total + item.product.price * item.quantity;
    }, 0);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-20 font-poppins">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-black mb-4 text-black">Shopping Cart</h1>
          <div className="w-20 h-0.5 bg-black mx-auto mb-4"></div>
          <p className="text-black text-lg">
            {cart.length === 0
              ? "Your cart is empty"
              : `You have ${cart.length} item(s) in your cart`}
          </p>
        </motion.div>

        {cart.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4 text-black">🛒</div>
            <h2 className="text-2xl font-bold mb-4 text-black">
              Your cart is empty
            </h2>
            <p className="text-black mb-8">
              Start shopping to add items to your cart
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.history.back()}
              className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors"
            >
              Continue Shopping
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
              >
                {cart.map((item: any, index: number) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-center p-6 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    {/* Product Image */}
                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mr-6 flex-shrink-0">
                      {item.product.image ? (
                        <Image
                          src={getImageUrl(item.product.image)}
                          alt={item.product.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="text-2xl text-black">📦</div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 text-black">
                        {item.product.name}
                      </h3>
                      <p className="text-black text-sm mb-2">
                        Rp {Number(item.product.price).toLocaleString("id-ID")}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity - 1)
                          }
                          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-black"
                        >
                          -
                        </motion.button>
                        <span className="font-bold w-8 text-center text-black">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity + 1)
                          }
                          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-black"
                        >
                          +
                        </motion.button>
                      </div>
                    </div>

                    {/* Subtotal & Remove */}
                    <div className="text-right">
                      <p className="font-bold text-lg mb-2 text-black">
                        Rp{" "}
                        {Number(
                          item.product.price * item.quantity
                        ).toLocaleString("id-ID")}
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRemove(item.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                      >
                        Remove
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-gray-50 rounded-2xl p-6 h-fit sticky top-24"
            >
              <h2 className="text-2xl font-bold mb-6 text-black">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-black">Subtotal</span>
                  <span className="font-medium text-black">
                    Rp {Number(calculateTotal()).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Shipping</span>
                  <span className="font-medium text-black">Free</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Tax</span>
                  <span className="font-medium text-black">Rp 0</span>
                </div>
                <div className="border-t border-gray-300 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-black">Total</span>
                    <span className="text-black">
                      Rp {Number(calculateTotal()).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckout}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors mb-4"
              >
                Checkout Now
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.history.back()}
                className="w-full border border-gray-300 text-black py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
              >
                Continue Shopping
              </motion.button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
