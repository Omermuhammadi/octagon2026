"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "outline-dark";
    size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
        const variants = {
            primary: "bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm hover:shadow-md",
            secondary: "bg-amber-500 text-white hover:bg-amber-600 border border-transparent shadow-sm",
            outline: "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-gray-400 shadow-sm",
            ghost: "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            // For buttons sitting on dark/hero backgrounds
            "outline-dark": "bg-transparent border border-white/30 text-white hover:bg-white/10 hover:border-white/50",
        };

        const sizes = {
            sm: "px-3 py-1.5 text-xs",
            md: "px-4 py-2 text-sm",
            lg: "px-8 py-3 text-lg",
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-bold uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:pointer-events-none",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);
Button.displayName = "Button";

export { Button };
