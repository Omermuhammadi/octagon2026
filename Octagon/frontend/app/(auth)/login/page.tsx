"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login, user, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && isAuthenticated && user) {
            const dashboardPath = user.role === "coach" ? "/dashboard/coach" : "/dashboard/fan";
            router.push(dashboardPath);
        }
    }, [authLoading, isAuthenticated, user, router]);

    // Show loading while checking auth state or if authenticated (redirecting)
    if (authLoading || isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            await login(email, password);
            // Redirect is handled by useEffect when isAuthenticated changes
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Invalid email or password");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-black">
            {/* Left Side - Image */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-black z-10" />
                <img
                    src="/images/auth-sidebar-sleek.png"
                    alt="Octagon Oracle Fighter"
                    className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 p-12 z-20">
                    <h2 className="text-5xl font-display italic text-white mb-4">
                        ENTER THE <span className="text-octagon-red">OCTAGON</span>
                    </h2>
                    <p className="text-gray-300 text-lg max-w-md">
                        Join the elite community of fighters and analysts. Predict, train, and dominate.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-white">

                <div className="w-full max-w-md space-y-8 relative z-10">
                    <div className="text-center">
                        <h1 className="text-3xl font-display italic text-gray-900 mb-2">WELCOME BACK</h1>
                        <p className="text-gray-500">Enter your credentials to access your dashboard.</p>
                    </div>

                    {/* Toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-lg mb-8">
                        <button className="flex-1 py-2 text-sm font-bold uppercase tracking-wider bg-white text-gray-900 rounded-md shadow-sm transition-all">
                            Log In
                        </button>
                        <Link href="/register" className="flex-1">
                            <button className="w-full py-2 text-sm font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-all">
                                Sign Up
                            </button>
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email Address</label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="fighter@octagon.com"
                                    required
                                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Password</label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded bg-red-50 border border-red-200 flex items-center gap-2 text-red-600 text-sm"
                            >
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </motion.div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                                <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                            </label>
                            <Link href="/forgot-password" className="text-red-600 hover:text-red-700 transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full py-6 text-lg font-heading uppercase tracking-widest"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
