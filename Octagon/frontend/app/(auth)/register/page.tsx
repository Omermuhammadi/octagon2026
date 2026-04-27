"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/PasswordStrength";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Dumbbell, Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"coach" | "fan">("fan");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { register, user, isAuthenticated, isLoading: authLoading } = useAuth();
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
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validate password strength
        if (!isPasswordStrong(password)) {
            setError("Please create a stronger password that meets all requirements");
            return;
        }

        setIsLoading(true);

        try {
            const fullName = `${firstName} ${lastName}`.trim();
            await register(fullName, email, password, role);
            // Redirect is handled by useEffect when isAuthenticated changes
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Registration failed. Please try again.");
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
                        FORGE YOUR <span className="text-octagon-gold">LEGACY</span>
                    </h2>
                    <p className="text-gray-300 text-lg max-w-md">
                        Whether you fight or follow, Octagon Oracle gives you the edge.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-y-auto bg-white">

                <div className="w-full max-w-md space-y-8 relative z-10 my-auto">
                    <div className="text-center">
                        <h1 className="text-3xl font-display italic text-gray-900 mb-2">CREATE ACCOUNT</h1>
                        <p className="text-gray-500">Join the ultimate MMA analytics platform.</p>
                    </div>

                    {/* Toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-lg mb-8">
                        <Link href="/login" className="flex-1">
                            <button className="w-full py-2 text-sm font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-all">
                                Log In
                            </button>
                        </Link>
                        <button className="flex-1 py-2 text-sm font-bold uppercase tracking-wider bg-white text-gray-900 rounded-md shadow-sm transition-all">
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">First Name</label>
                                <Input
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Conor"
                                    required
                                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-amber-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Last Name</label>
                                <Input
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="McGregor"
                                    required
                                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-amber-400"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email Address</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="fighter@octagon.com"
                                required
                                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-amber-400"
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
                                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-amber-400"
                            />
                            <PasswordStrength password={password} className="mt-3" />
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Select Your Path</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    onClick={() => setRole("coach")}
                                    className={cn(
                                        "cursor-pointer relative p-4 rounded-lg border transition-all duration-300 flex flex-col items-center gap-2 group",
                                        role === "coach"
                                            ? "bg-amber-50 border-amber-400"
                                            : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <Dumbbell className={cn("w-6 h-6", role === "coach" ? "text-amber-500" : "text-gray-400 group-hover:text-gray-600")} />
                                    <span className={cn("text-xs font-bold uppercase tracking-wider", role === "coach" ? "text-gray-900" : "text-gray-500 group-hover:text-gray-700")}>Coach / Fighter</span>
                                    {role === "coach" && (
                                        <div className="absolute top-2 right-2">
                                            <Check className="w-3 h-3 text-amber-500" />
                                        </div>
                                    )}
                                </div>

                                <div
                                    onClick={() => setRole("fan")}
                                    className={cn(
                                        "cursor-pointer relative p-4 rounded-lg border transition-all duration-300 flex flex-col items-center gap-2 group",
                                        role === "fan"
                                            ? "bg-red-50 border-red-400"
                                            : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <Star className={cn("w-6 h-6", role === "fan" ? "text-red-600" : "text-gray-400 group-hover:text-gray-600")} />
                                    <span className={cn("text-xs font-bold uppercase tracking-wider", role === "fan" ? "text-gray-900" : "text-gray-500 group-hover:text-gray-700")}>Fan / Learner</span>
                                    {role === "fan" && (
                                        <div className="absolute top-2 right-2">
                                            <Check className="w-3 h-3 text-red-600" />
                                        </div>
                                    )}
                                </div>
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

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full py-6 text-lg font-heading uppercase tracking-widest"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
