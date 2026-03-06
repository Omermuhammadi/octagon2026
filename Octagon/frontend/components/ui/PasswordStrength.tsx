"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
    password: string;
    className?: string;
}

export interface PasswordRequirements {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
}

export const validatePassword = (password: string): PasswordRequirements => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
});

export const isPasswordStrong = (password: string): boolean => {
    const req = validatePassword(password);
    return req.minLength && req.hasUppercase && req.hasLowercase && req.hasNumber && req.hasSymbol;
};

export const getPasswordStrength = (password: string): { label: string; color: string; percent: number } => {
    const req = validatePassword(password);
    const passed = Object.values(req).filter(Boolean).length;
    
    if (passed <= 1) return { label: "Very Weak", color: "bg-red-500", percent: 20 };
    if (passed === 2) return { label: "Weak", color: "bg-orange-500", percent: 40 };
    if (passed === 3) return { label: "Fair", color: "bg-yellow-500", percent: 60 };
    if (passed === 4) return { label: "Good", color: "bg-blue-500", percent: 80 };
    return { label: "Strong", color: "bg-green-500", percent: 100 };
};

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
    const requirements = useMemo(() => validatePassword(password), [password]);
    const strength = useMemo(() => getPasswordStrength(password), [password]);

    const checks = [
        { key: "minLength", label: "At least 8 characters", met: requirements.minLength },
        { key: "hasUppercase", label: "One uppercase letter (A-Z)", met: requirements.hasUppercase },
        { key: "hasLowercase", label: "One lowercase letter (a-z)", met: requirements.hasLowercase },
        { key: "hasNumber", label: "One number (0-9)", met: requirements.hasNumber },
        { key: "hasSymbol", label: "One symbol (!@#$%...)", met: requirements.hasSymbol },
    ];

    if (!password) return null;

    return (
        <div className={cn("space-y-3", className)}>
            {/* Strength Bar */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Password Strength</span>
                    <span className={cn(
                        "font-semibold",
                        strength.percent <= 40 ? "text-red-400" : 
                        strength.percent <= 60 ? "text-yellow-400" : 
                        strength.percent <= 80 ? "text-blue-400" : "text-green-400"
                    )}>
                        {strength.label}
                    </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className={cn("h-full transition-all duration-300", strength.color)}
                        style={{ width: `${strength.percent}%` }}
                    />
                </div>
            </div>

            {/* Requirements List */}
            <div className="grid grid-cols-1 gap-1">
                {checks.map((check) => (
                    <div 
                        key={check.key}
                        className={cn(
                            "flex items-center gap-2 text-xs transition-colors",
                            check.met ? "text-green-400" : "text-gray-500"
                        )}
                    >
                        {check.met ? (
                            <Check className="w-3 h-3" />
                        ) : (
                            <X className="w-3 h-3" />
                        )}
                        {check.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
