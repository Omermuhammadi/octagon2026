"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi, ApiError, UserData } from "@/lib/api";

export type UserRole = "coach" | "fan" | "fighter" | "beginner";

export interface User extends UserData {
    // User now extends UserData from api.ts which includes all profile fields
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const TOKEN_KEY = "octagon_token";
const USER_KEY = "octagon_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from localStorage and verify token on mount
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem(TOKEN_KEY);
            const storedUser = localStorage.getItem(USER_KEY);

            if (storedToken && storedUser) {
                try {
                    // Verify token is still valid by calling /me endpoint
                    const response = await authApi.getMe(storedToken);
                    if (response.success && response.data) {
                        setUser(response.data.user);
                        setToken(storedToken);
                        setIsAuthenticated(true);
                        // Update stored user with latest data
                        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
                    } else {
                        // Token invalid, clear storage
                        localStorage.removeItem(TOKEN_KEY);
                        localStorage.removeItem(USER_KEY);
                    }
                } catch {
                    // Token expired or invalid, clear storage
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const refreshUser = async () => {
        const currentToken = token || localStorage.getItem(TOKEN_KEY);
        if (!currentToken) return;

        try {
            const response = await authApi.getMe(currentToken);
            if (response.success && response.data) {
                setUser(response.data.user);
                localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
            }
        } catch (error) {
            console.error("Failed to refresh user:", error);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await authApi.login({ email, password });
            
            if (response.success && response.data) {
                const { user: userData, token: authToken } = response.data;
                
                // Store token and user in localStorage
                localStorage.setItem(TOKEN_KEY, authToken);
                localStorage.setItem(USER_KEY, JSON.stringify(userData));
                
                setUser(userData);
                setToken(authToken);
                setIsAuthenticated(true);
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw new Error(error.message);
            }
            throw new Error("Login failed. Please try again.");
        }
    };

    const register = async (name: string, email: string, password: string, role: UserRole) => {
        try {
            const response = await authApi.register({ name, email, password, role });
            
            if (response.success && response.data) {
                const { user: userData, token: authToken } = response.data;
                
                // Store token and user in localStorage
                localStorage.setItem(TOKEN_KEY, authToken);
                localStorage.setItem(USER_KEY, JSON.stringify(userData));
                
                setUser(userData);
                setToken(authToken);
                setIsAuthenticated(true);
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw new Error(error.message);
            }
            throw new Error("Registration failed. Please try again.");
        }
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

// Helper to get token for API calls
export function getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}
