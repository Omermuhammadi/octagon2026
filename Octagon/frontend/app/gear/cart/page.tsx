"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { gearApi, ProductData } from "@/lib/api";
import {
    ShoppingCart, Trash2, Plus, Minus, ArrowLeft,
    Loader2, CheckCircle, MapPin, CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface CartItem {
    product: ProductData;
    quantity: number;
}

export default function CartPage() {
    const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [address, setAddress] = useState("");
    const [ordering, setOrdering] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [error, setError] = useState("");
    const [cartLoaded, setCartLoaded] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Load cart
    useEffect(() => {
        const saved = localStorage.getItem("octagon_cart");
        if (saved) {
            try { setCart(JSON.parse(saved)); } catch {}
        }
        setCartLoaded(true);
    }, []);

    // Save cart (only after initial load)
    useEffect(() => {
        if (cartLoaded) {
            localStorage.setItem("octagon_cart", JSON.stringify(cart));
        }
    }, [cart, cartLoaded]);

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product._id === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const removeItem = (productId: string) => {
        setCart(prev => prev.filter(item => item.product._id !== productId));
    };

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const shipping = subtotal > 5000 ? 0 : 500;
    const total = subtotal + shipping;

    const handleCheckout = async () => {
        if (!token || cart.length === 0) return;
        if (!address.trim()) {
            setError("Please enter a shipping address");
            return;
        }
        setError("");
        setOrdering(true);

        try {
            const items = cart.map(item => ({
                productId: item.product._id,
                quantity: item.quantity,
            }));

            const res = await gearApi.checkout(items, address, token);
            if (res.success) {
                setOrderSuccess(true);
                setCart([]);
                localStorage.removeItem("octagon_cart");
            }
        } catch (e: any) {
            setError(e.message || "Checkout failed. Please try again.");
        } finally {
            setOrdering(false);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16 flex items-center justify-center">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-md mx-auto p-8"
                >
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                    <h1 className="text-3xl font-bold text-white mb-4">Order Confirmed!</h1>
                    <p className="text-neutral-400 mb-8">Your order has been placed successfully. You will receive a confirmation shortly.</p>
                    <Link href="/gear"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
                    >
                        Continue Shopping
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <Link href="/gear" className="text-neutral-400 hover:text-white flex items-center gap-1 mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Store
                    </Link>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-red-500" />
                        Your Cart ({cart.length} items)
                    </h1>
                </motion.div>

                {cart.length === 0 ? (
                    <div className="text-center py-20">
                        <ShoppingCart className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                        <p className="text-neutral-400 text-lg mb-6">Your cart is empty</p>
                        <Link href="/gear"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
                        >
                            Browse Gear
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {cart.map((item) => (
                                <motion.div key={item.product._id} layout
                                    className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-4 flex gap-4"
                                >
                                    <div className="w-24 h-24 bg-neutral-800 rounded-xl overflow-hidden flex-shrink-0">
                                        {item.product.images[0] ? (
                                            <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                                <ShoppingCart className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold">{item.product.name}</h3>
                                        <p className="text-neutral-500 text-sm">{item.product.category}</p>
                                        <p className="text-white font-bold mt-2">Rs {item.product.price.toLocaleString()}</p>
                                    </div>
                                    <div className="flex flex-col items-end justify-between">
                                        <button onClick={() => removeItem(item.product._id)} className="text-neutral-500 hover:text-red-400 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center gap-3 bg-white/5 rounded-lg px-2 py-1">
                                            <button onClick={() => updateQuantity(item.product._id, -1)} className="text-neutral-400 hover:text-white transition-colors">
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="text-white font-bold min-w-[20px] text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.product._id, 1)} className="text-neutral-400 hover:text-white transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="space-y-6">
                            <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                                <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-400">Subtotal</span>
                                        <span className="text-white">Rs {subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-400">Shipping</span>
                                        <span className="text-white">{shipping === 0 ? 'Free' : `Rs ${shipping}`}</span>
                                    </div>
                                    {shipping > 0 && (
                                        <p className="text-xs text-neutral-500">Free shipping on orders over Rs 5,000</p>
                                    )}
                                    <div className="border-t border-white/10 pt-3 flex justify-between">
                                        <span className="text-white font-bold">Total</span>
                                        <span className="text-white text-xl font-bold">Rs {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Shipping Address */}
                                <div className="mb-4">
                                    <label className="block text-sm text-neutral-400 mb-2 flex items-center gap-1">
                                        <MapPin className="w-4 h-4" /> Shipping Address
                                    </label>
                                    <textarea
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Enter your shipping address..."
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-400 text-sm mb-4">{error}</p>
                                )}

                                <button onClick={handleCheckout} disabled={ordering || cart.length === 0}
                                    className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-lg rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                                >
                                    {ordering ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                    ) : (
                                        <><CreditCard className="w-5 h-5" /> Place Order</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
