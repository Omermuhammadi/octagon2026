"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * ProtectedRoute - Wraps pages that require authentication
 * Redirects unauthenticated users to the login page
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    // Show loading while checking auth state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-octagon-red" />
            </div>
        );
    }

    // Don't render children if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-octagon-red" />
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * PublicOnlyRoute - Wraps pages that should only be accessible to non-authenticated users
 * Redirects authenticated users to their appropriate dashboard
 */
export function PublicOnlyRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && isAuthenticated && user) {
            const dashboardPath = user.role === "coach" ? "/dashboard/coach" : "/dashboard/fan";
            router.push(dashboardPath);
        }
    }, [isLoading, isAuthenticated, user, router]);

    // Show loading while checking auth state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-octagon-red" />
            </div>
        );
    }

    // Don't render children if authenticated (they will be redirected)
    if (isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-octagon-red" />
            </div>
        );
    }

    return <>{children}</>;
}
