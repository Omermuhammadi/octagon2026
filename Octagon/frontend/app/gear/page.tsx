"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { gearApi, ProductData } from "@/lib/api";
import {
    ShoppingBag, Search, Star, Filter, ShoppingCart,
    Loader2, Package, ChevronRight, Plus, Minus, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const categories = [
    { id: "all", label: "All Products" },
    { id: "gloves", label: "Gloves" },
    { id: "pads", label: "Pads & Mitts" },
    { id: "protection", label: "Protection" },
    { id: "apparel", label: "Apparel" },
    { id: "equipment", label: "Equipment" },
    { id: "supplements", label: "Supplements" },
];

const sortOptions = [
    { id: "featured", label: "Featured" },
    { id: "price-low", label: "Price: Low to High" },
    { id: "price-high", label: "Price: High to Low" },
    { id: "rating", label: "Top Rated" },
    { id: "newest", label: "Newest" },
];

interface CartItem {
    product: ProductData;
    quantity: number;
}

export default function GearPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [products, setProducts] = useState<ProductData[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("all");
    const [sort, setSort] = useState("featured");
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [addedToCart, setAddedToCart] = useState<string | null>(null);
    const [cartLoaded, setCartLoaded] = useState(false);

    // Load cart from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("octagon_cart");
        if (saved) {
            try { setCart(JSON.parse(saved)); } catch {}
        }
        setCartLoaded(true);
    }, []);

    // Save cart to localStorage (only after initial load)
    useEffect(() => {
        if (cartLoaded) {
            localStorage.setItem("octagon_cart", JSON.stringify(cart));
        }
    }, [cart, cartLoaded]);

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await gearApi.getProducts({
                    category: category !== "all" ? category : undefined,
                    search: search || undefined,
                    sort,
                });
                if (res.success && res.data) {
                    setProducts(res.data);
                }
            } catch (e) {
                console.error("Failed to fetch products:", e);
            } finally {
                setLoading(false);
            }
        };
        const timer = setTimeout(fetchProducts, 300);
        return () => clearTimeout(timer);
    }, [category, sort, search]);

    const addToCart = (product: ProductData) => {
        setCart(prev => {
            const existing = prev.find(item => item.product._id === product._id);
            if (existing) {
                return prev.map(item =>
                    item.product._id === product._id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
        setAddedToCart(product._id);
        setTimeout(() => setAddedToCart(null), 1500);
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black pt-24 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-display italic text-white mb-4">
                        GEAR <span className="text-octagon-red">STORE</span>
                    </h1>
                    <p className="text-neutral-400 max-w-xl mx-auto text-lg">
                        Professional MMA training gear for all levels
                    </p>
                </motion.div>

                {/* Cart Badge */}
                {cartCount > 0 && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        className="fixed top-28 right-6 z-40"
                    >
                        <Link href="/gear/cart"
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full shadow-lg transition-colors"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            <span className="font-bold">{cartCount}</span>
                            <span className="text-sm">Rs {cartTotal.toLocaleString()}</span>
                        </Link>
                    </motion.div>
                )}

                {/* Filters Bar */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="mb-8 space-y-4"
                >
                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search gear..."
                            className="w-full bg-neutral-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setCategory(cat.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    category === cat.id
                                        ? "bg-red-500/20 border border-red-500/50 text-red-400"
                                        : "bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10"
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-neutral-500" />
                        <select value={sort} onChange={(e) => setSort(e.target.value)}
                            className="bg-neutral-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                        >
                            {sortOptions.map(opt => (
                                <option key={opt.id} value={opt.id} className="bg-neutral-900">{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </motion.div>

                {/* Products Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                        <p className="text-neutral-400 text-lg">No products found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product, idx) => (
                            <motion.div key={product._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden group hover:border-white/10 transition-all"
                            >
                                {/* Image */}
                                <div className="aspect-square bg-neutral-800 relative overflow-hidden">
                                    {product.images[0] ? (
                                        <img src={product.images[0]} alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-16 h-16 text-neutral-600" />
                                        </div>
                                    )}
                                    {product.featured && (
                                        <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                                            Featured
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">{product.category}</p>
                                    <h3 className="text-white font-bold mb-2 line-clamp-1">{product.name}</h3>
                                    <p className="text-neutral-400 text-sm mb-3 line-clamp-2">{product.description}</p>

                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            <span className="text-white text-sm font-medium">{product.rating}</span>
                                        </div>
                                        <span className="text-neutral-500 text-sm">({product.reviewCount})</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-xl font-bold">Rs {product.price.toLocaleString()}</span>
                                        <button onClick={() => addToCart(product)}
                                            className={`p-2 rounded-lg transition-all ${
                                                addedToCart === product._id
                                                    ? "bg-green-500/20 text-green-400"
                                                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                            }`}
                                        >
                                            {addedToCart === product._id ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                <Plus className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                    {product.stock < 10 && product.stock > 0 && (
                                        <p className="text-yellow-500 text-xs mt-2">Only {product.stock} left in stock</p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
