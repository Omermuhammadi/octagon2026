"use client";

import { useEffect, useState } from "react";

export function CountdownTimer() {
    const [timeLeft, setTimeLeft] = useState({
        hours: 3,
        minutes: 9,
        seconds: 13
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-black/60 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-lg">
            <div className="text-5xl md:text-6xl font-display text-white tracking-widest mb-1">
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div className="flex justify-center gap-12 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>Hrs</span>
                <span>Min</span>
                <span>Sec</span>
            </div>
        </div>
    );
}
