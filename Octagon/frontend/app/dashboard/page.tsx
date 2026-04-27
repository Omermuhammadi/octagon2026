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
            const roleRoutes: Record<string, string> = {
                coach: '/dashboard/coach',
                fighter: '/dashboard/fighter',
                fan: '/dashboard/fan',
                beginner: '/dashboard/beginner',
            };
            router.push(roleRoutes[user.role] ?? '/dashboard/fan');
        }
    }, [isLoading, isAuthenticated, user, router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
    );
}
