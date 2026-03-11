"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { gearApi, OrderData } from "@/lib/api";
import {
    ShoppingBag, ArrowLeft, Loader2, Package,
    Clock, CheckCircle, XCircle, Truck
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
    pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Pending" },
    confirmed: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", label: "Confirmed" },
    processing: { icon: Truck, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Processing" },
    shipped: { icon: Truck, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", label: "Shipped" },
    delivered: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", label: "Delivered" },
    cancelled: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Cancelled" },
};

export default function OrdersPage() {
    const { token, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [orders, setOrders] = useState<OrderData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!token) return;
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const res = await gearApi.getOrders(token);
                if (res.success && res.data) {
                    setOrders(res.data);
                }
            } catch (e: any) {
                setError(e.message || "Failed to load orders");
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [token]);

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
                        <ShoppingBag className="w-8 h-8 text-red-500" />
                        Order History
                    </h1>
                </motion.div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-neutral-400">{error}</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                        <p className="text-neutral-400 text-lg mb-6">No orders yet</p>
                        <Link href="/gear"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
                        >
                            Start Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order, idx) => {
                            const status = statusConfig[order.status] || statusConfig.pending;
                            const StatusIcon = status.icon;
                            const orderDate = new Date(order.createdAt);

                            return (
                                <motion.div key={order._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">
                                                Order #{order._id.slice(-8).toUpperCase()}
                                            </p>
                                            <p className="text-sm text-neutral-400">
                                                {orderDate.toLocaleDateString("en-PK", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                                {" at "}
                                                {orderDate.toLocaleTimeString("en-PK", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.bg} ${status.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {status.label}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {order.items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span className="text-neutral-300">
                                                    {item.name} <span className="text-neutral-500">x{item.quantity}</span>
                                                </span>
                                                <span className="text-white font-medium">
                                                    Rs {(item.price * item.quantity).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                                        <span className="text-neutral-400 text-sm">
                                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                                        </span>
                                        <span className="text-white text-lg font-bold">
                                            Rs {order.total.toLocaleString()}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
