"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
        const variants = {
            primary: "bg-octagon-red text-white hover:bg-red-700 border border-transparent shadow-[0_0_15px_rgba(210,10,10,0.5)] hover:shadow-[0_0_25px_rgba(210,10,10,0.7)]",
            secondary: "bg-octagon-gold text-black hover:bg-yellow-500 border border-transparent",
            outline: "bg-transparent border border-white/20 text-white hover:bg-white/10 hover:border-white/40",
            ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
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
                    "inline-flex items-center justify-center rounded-sm font-bold uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-octagon-red/50 disabled:opacity-50 disabled:pointer-events-none",
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
