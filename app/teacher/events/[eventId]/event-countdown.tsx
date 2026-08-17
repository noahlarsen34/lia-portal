"use client";

import { useEffect, useState } from "react";

type CountdownValues = {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    complete: boolean;
};

function calculateCountdown(targetTime: string): CountdownValues {
    const difference = new Date(targetTime).getTime() - Date.now();

    if (difference <= 0) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            complete: true,
        };
    }

    return {
        days: Math.floor(difference / 86_400_000),
        hours: Math.floor((difference / 3_600_000) % 24),
        minutes: Math.floor((difference / 60_000) % 60),
        seconds: Math.floor((difference / 1_000) % 60),
        complete: false,
    };
}

export function EventCountdown({
    targetTime,
}: {
    targetTime: string;
}) {
    const [countdown, setCountdown] =
        useState<CountdownValues | null>(null);

    useEffect(() => {
        const updateCountdown = () => {
            setCountdown(calculateCountdown(targetTime));
        };

        updateCountdown();

        const interval = window.setInterval(
            updateCountdown,
            1_000,
        );

        return () => window.clearInterval(interval);
    }, [targetTime]);

    if (countdown?.complete) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center">
                <p className="text-2xl font-bold text-white">
                    The event has started!
                </p>
            </div>
        );
    }

    const values = [
        { label: "Days", value: countdown?.days },
        { label: "Hours", value: countdown?.hours },
        { label: "Minutes", value: countdown?.minutes },
        { label: "Seconds", value: countdown?.seconds },
    ];

    return (
        <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            aria-label="Time remaining until the event"
        >
            {values.map((item) => (
                <div
                    key={item.label}
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-5 text-center shadow-inner"
                >
                    <p className="tabular-nums text-3xl font-semibold text-white sm:text-4xl">
                        {item.value === undefined
                            ? "--"
                            : String(item.value).padStart(2, "0")}
                    </p>

                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/65">
                        {item.label}
                    </p>
                </div>
            ))}
        </div>
    );
}
