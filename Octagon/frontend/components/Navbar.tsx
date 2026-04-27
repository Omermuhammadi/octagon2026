"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, User, Dumbbell, Star, Zap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [visible, setVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const { user, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setScrolled(currentScrollY > 50);
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setVisible(false);
            } else {
                setVisible(true);
            }
            setLastScrollY(currentScrollY);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    const isAuthPage = pathname === "/login" || pathname === "/register";
    const isLandingPage = pathname === "/";

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    const publicLinks = [
        { label: "ANALYTICS", href: "/analytics" },
        { label: "FEATURES", href: "/#features" },
        { label: "HOW IT WORKS", href: "/#how-it-works" },
    ];

    const getNavLinks = () => {
        if (!isAuthenticated || !user) return publicLinks;
        if (user.role === "coach") {
            return [
                { label: "DASHBOARD", href: "/dashboard/coach" },
                { label: "TRAINEES", href: "/connections" },
                { label: "ASSIGNMENTS", href: "/assignments" },
                { label: "MESSAGES", href: "/messages" },
                { label: "STRATEGY", href: "/strategy" },
                { label: "FORM CHECK", href: "/form-check" },
                { label: "EVENTS", href: "/events" },
                { label: "ANALYTICS", href: "/analytics" },
            ];
        }
        if (user.role === "fighter") {
            return [
                { label: "DASHBOARD", href: "/dashboard/fighter" },
                { label: "FIGHT CAMP", href: "/fight-camp" },
                { label: "WEIGHT CUT", href: "/weight-cut" },
                { label: "DOSSIER", href: "/opponent-dossier" },
                { label: "ASSIGNMENTS", href: "/assignments" },
                { label: "MESSAGES", href: "/messages" },
                { label: "TRAINING", href: "/training" },
                { label: "ANALYTICS", href: "/analytics" },
            ];
        }
        if (user.role === "beginner") {
            return [
                { label: "DASHBOARD", href: "/dashboard/beginner" },
                { label: "MY COACH", href: "/connections" },
                { label: "ASSIGNMENTS", href: "/assignments" },
                { label: "MESSAGES", href: "/messages" },
                { label: "TRAINING", href: "/training" },
                { label: "FORM CHECK", href: "/form-check" },
                { label: "EVENTS", href: "/events" },
                { label: "ANALYTICS", href: "/analytics" },
            ];
        }
        // Fan
        return [
            { label: "DASHBOARD", href: "/dashboard/fan" },
            { label: "EVENTS", href: "/events" },
            { label: "PREDICTIONS", href: "/prediction" },
            { label: "COMPARISON", href: "/comparison" },
            { label: "TRAINING", href: "/training" },
            { label: "FORM CHECK", href: "/form-check" },
            { label: "SELF-DEFENSE", href: "/self-defense" },
            { label: "ANALYTICS", href: "/analytics" },
        ];
    };

    const navLinks = getNavLinks();
    const logoHref = isAuthPage
        ? "/"
        : !isAuthenticated || !user
            ? "/"
            : user.role === "coach"
                ? "/dashboard/coach"
                : user.role === "fighter"
                    ? "/dashboard/fighter"
                    : user.role === "beginner"
                        ? "/dashboard/beginner"
                        : "/dashboard/fan";

    /* On the landing page (dark hero) the nav is always dark-glass.
       On all other pages (white bg), the nav transitions to white. */
    const isOnDarkPage = isLandingPage;

    const navBg = isOnDarkPage
        ? scrolled ? "bg-black/90 border-white/15 shadow-black/20" : "bg-black/60 border-white/10"
        : scrolled ? "bg-white border-gray-200 shadow-sm shadow-gray-200/80" : "bg-white/95 border-gray-200";

    const linkColor = isOnDarkPage ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900";
    const logoTextColor = isOnDarkPage ? "text-white" : "text-gray-900";
    const isActiveLink = (href: string) => pathname === href || pathname.startsWith(href + "/");

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-7xl"
        >
            <div className={`backdrop-blur-md border rounded-2xl px-5 py-3 flex items-center justify-between transition-all duration-300 ${navBg}`}>

                {/* Logo */}
                <Link href={logoHref} className="flex items-center gap-2.5 group flex-shrink-0">
                    <motion.div
                        className="w-8 h-8 relative overflow-hidden rounded-lg shadow-sm"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <img src="/images/logo.png" alt="Octagon Oracle" className="w-full h-full object-cover" />
                    </motion.div>
                    <span className={`text-lg font-display italic tracking-tight ${logoTextColor}`}>
                        OCTAGON <span className="text-red-600">ORACLE</span>
                    </span>
                </Link>

                {/* Desktop nav links */}
                <div className="hidden lg:flex items-center gap-6 overflow-x-auto no-scrollbar">
                    {navLinks.map((link, index) => (
                        <motion.div key={link.label} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                            <Link
                                href={link.href}
                                className={`text-xs font-bold uppercase tracking-wider transition-colors relative group whitespace-nowrap ${
                                    isActiveLink(link.href) ? "text-red-600" : linkColor
                                }`}
                            >
                                {link.label}
                                <span className={`absolute -bottom-0.5 left-0 w-full h-0.5 bg-red-600 transform transition-transform duration-300 origin-center ${
                                    isActiveLink(link.href) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                }`} />
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Auth section */}
                {!isAuthPage && (
                    <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                        {isAuthenticated && user ? (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                className={`flex items-center gap-3 pl-3 border-l ${isOnDarkPage ? "border-white/15" : "border-gray-200"}`}
                            >
                                <Link href="/profile" className="flex items-center gap-2 group">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                        user.role === "coach"
                                            ? "bg-amber-50 border-amber-200 text-amber-600"
                                            : "bg-red-50 border-red-200 text-red-600"
                                    }`}>
                                        {user.role === "coach" ? <Dumbbell className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                                    </div>
                                    <span className={`text-xs font-bold transition-colors ${isOnDarkPage ? "text-white group-hover:text-red-400" : "text-gray-800 group-hover:text-red-600"}`}>
                                        {user.name.split(" ")[0]}
                                    </span>
                                </Link>
                                <button onClick={handleLogout} className={`transition-colors ${isOnDarkPage ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-700"}`} title="Logout">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                                <Link href="/login" className={`text-sm font-bold transition-colors ${isOnDarkPage ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}>
                                    Sign in
                                </Link>
                                <Link href="/register">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Zap className="w-3.5 h-3.5" />
                                        Get Started
                                    </motion.button>
                                </Link>
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Mobile toggle */}
                <div className="md:hidden">
                    <motion.button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`p-2 transition-colors ${isOnDarkPage ? "text-gray-300 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
                        whileTap={{ scale: 0.9 }}
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </motion.button>
                </div>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
                    >
                        <div className="flex flex-col gap-1">
                            {navLinks.map((link) => (
                                <Link key={link.label} href={link.href} onClick={() => setIsOpen(false)}
                                    className={`px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                                        isActiveLink(link.href) ? "bg-red-50 text-red-600" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <div className="h-px bg-gray-100 my-2" />
                            {isAuthenticated && user ? (
                                <>
                                    <Link href="/profile" onClick={() => setIsOpen(false)}
                                        className="px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                                    >
                                        <User className="w-4 h-4" /> Profile
                                    </Link>
                                    <button onClick={() => { handleLogout(); setIsOpen(false); }}
                                        className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                                    >
                                        <LogOut className="w-4 h-4" /> Logout
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col gap-2 pt-1">
                                    <Link href="/login" onClick={() => setIsOpen(false)}
                                        className="px-4 py-2.5 text-center text-sm font-bold text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        Sign In
                                    </Link>
                                    <Link href="/register" onClick={() => setIsOpen(false)}
                                        className="px-4 py-2.5 text-center text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
