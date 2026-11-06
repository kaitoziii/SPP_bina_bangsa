"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  subtle?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  subtle = false,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`rounded-xl border transition-all ${
        subtle
          ? "bg-zinc-50/70 border-zinc-200/60 dark:bg-zinc-900/40 dark:border-zinc-800/60"
          : "bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
