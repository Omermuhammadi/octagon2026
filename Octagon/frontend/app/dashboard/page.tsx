"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        if (user) {
            // Route all roles to the appropriate dashboard
            // fighter and beginner roles use the fan dashboard
            const dashboardRole = (user.role === 'coach') ? 'coach' : 'fan';
            router.push(`/dashboard/${dashboardRole}`);
        }
    }, [isLoading, isAuthenticated, user, router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
    );
}
