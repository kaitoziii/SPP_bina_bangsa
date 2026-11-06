"use client";

import React, { useEffect, useState } from "react";
import { formatRupiah } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  formatAsRupiah?: boolean;
  durationMs?: number;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  formatAsRupiah = false,
  durationMs = 600,
  className = "",
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      // Apple easeOut quintic
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValue + (endValue - startValue) * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, durationMs]);

  const text = formatAsRupiah
    ? formatRupiah(displayValue)
    : displayValue.toLocaleString("id-ID");

  return <span className={`tabular-nums font-semibold ${className}`}>{text}</span>;
};
