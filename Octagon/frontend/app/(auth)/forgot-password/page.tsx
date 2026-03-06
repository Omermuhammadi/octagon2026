"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/PasswordStrength";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Loader2, ArrowLeft, Mail, Key, Lock } from "lucide-react";
import { authApi } from "@/lib/api";

type Step = "email" | "code" | "success";

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [devCode, setDevCode] = useState<string | null>(null);
    const router = useRouter();

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await authApi.forgotPassword(email);
            // In development, the API returns the code for testing
            if (response.data?.resetCode) {
                setDevCode(response.data.resetCode);
            }
            setStep("code");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to send reset code. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!isPasswordStrong(newPassword)) {
            setError("Please create a stronger password that meets all requirements");
            return;
        }

        setIsLoading(true);

        try {
            await authApi.resetPassword({
                email,
                code,
                newPassword,
            });
            setStep("success");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Invalid or expired code. Please try again.");
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
                        RESET YOUR <span className="text-octagon-red">PASSWORD</span>
                    </h2>
                    <p className="text-gray-300 text-lg max-w-md">
                        Don&apos;t worry, we&apos;ll help you get back in the octagon.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-octagon-red/5 rounded-full blur-3xl pointer-events-none" />

                <div className="w-full max-w-md space-y-8 relative z-10">
                    {/* Back to login */}
                    <Link 
                        href="/login" 
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to login
                    </Link>

                    {step === "email" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-octagon-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-8 h-8 text-octagon-red" />
                                </div>
                                <h1 className="text-3xl font-display italic text-white mb-2">FORGOT PASSWORD?</h1>
                                <p className="text-gray-400">Enter your email and we&apos;ll send you a reset code.</p>
                            </div>

                            <form onSubmit={handleEmailSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                        Email Address
                                    </label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="fighter@octagon.com"
                                        required
                                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-octagon-red focus:ring-octagon-red"
                                    />
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm"
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
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
                                </Button>
                            </form>
                        </motion.div>
                    )}

                    {step === "code" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-octagon-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Key className="w-8 h-8 text-octagon-red" />
                                </div>
                                <h1 className="text-3xl font-display italic text-white mb-2">ENTER CODE</h1>
                                <p className="text-gray-400">
                                    Enter the 6-digit code and your new password.
                                </p>
                            </div>

                            {/* Development mode: show the code */}
                            {devCode && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-4 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm"
                                >
                                    <p className="font-bold mb-1">🔧 Development Mode</p>
                                    <p>Your reset code is: <span className="font-mono text-lg">{devCode}</span></p>
                                </motion.div>
                            )}

                            <form onSubmit={handleCodeSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                        Reset Code
                                    </label>
                                    <Input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        required
                                        maxLength={6}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-octagon-red focus:ring-octagon-red text-center text-2xl tracking-[0.5em] font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                        New Password
                                    </label>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-octagon-red focus:ring-octagon-red"
                                    />
                                    <PasswordStrength password={newPassword} className="mt-3" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                        Confirm Password
                                    </label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-octagon-red focus:ring-octagon-red"
                                    />
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </motion.div>
                                )}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full py-6 text-lg font-heading uppercase tracking-widest"
                                    disabled={isLoading || code.length !== 6}
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep("email");
                                        setCode("");
                                        setNewPassword("");
                                        setConfirmPassword("");
                                        setError("");
                                        setDevCode(null);
                                    }}
                                    className="w-full text-gray-400 hover:text-white transition-colors text-sm"
                                >
                                    Didn&apos;t receive a code? Try again
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === "success" && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-6"
                        >
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-display italic text-white mb-2">PASSWORD RESET!</h1>
                                <p className="text-gray-400">
                                    Your password has been successfully reset. You can now login with your new password.
                                </p>
                            </div>
                            <Button
                                variant="primary"
                                className="w-full py-6 text-lg font-heading uppercase tracking-widest"
                                onClick={() => router.push("/login")}
                            >
                                <Lock className="w-5 h-5 mr-2" />
                                Go to Login
                            </Button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
