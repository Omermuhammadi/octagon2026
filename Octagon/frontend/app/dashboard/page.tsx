"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        } else if (user) {
            // Redirect to role-specific dashboard
            router.push(`/dashboard/${user.role}`);
        }
    }, [isAuthenticated, user, router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-white text-xl font-display">Loading...</div>
        </div>
    );
}
