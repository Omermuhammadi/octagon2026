import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
    variant?: "default" | "glass" | "outline" | "dark";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, hoverEffect = false, variant = "glass", children, ...props }, ref) => {
        const variants = {
            default: "bg-white border border-gray-200 shadow-sm",
            glass: "bg-white border border-gray-200 shadow-md",
            outline: "bg-transparent border border-gray-300",
            // Keep a "dark" variant for sections that intentionally stay dark (hero areas)
            dark: "bg-white/5 backdrop-blur-md border border-white/10 shadow-xl",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl overflow-hidden relative transition-all duration-500",
                    variants[variant],
                    hoverEffect && "hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(220,38,38,0.2)] hover:border-red-200 group",
                    className
                )}
                {...props}
            >
                {hoverEffect && (
                    <div className="absolute inset-0 bg-gradient-to-b from-red-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                )}
                {children}
            </div>
        );
    }
);
Card.displayName = "Card";

export { Card };
