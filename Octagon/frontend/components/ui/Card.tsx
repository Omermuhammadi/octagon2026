import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
    variant?: "default" | "glass" | "outline";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, hoverEffect = false, variant = "glass", children, ...props }, ref) => {
        const variants = {
            default: "bg-octagon-dark border border-white/10",
            glass: "bg-white/5 backdrop-blur-md border border-white/10 shadow-xl",
            outline: "bg-transparent border border-white/20",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl overflow-hidden relative transition-all duration-500",
                    variants[variant],
                    hoverEffect && "hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(210,10,10,0.3)] hover:border-octagon-red/50 group",
                    className
                )}
                {...props}
            >
                {hoverEffect && (
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                )}
                {children}
            </div>
        );
    }
);
Card.displayName = "Card";

export { Card };
