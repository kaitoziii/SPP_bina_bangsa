"use client";

import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = "", id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(7);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-9 px-3 text-sm bg-white dark:bg-zinc-900 border rounded-lg transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-800 ${
            error
              ? "border-rose-500 text-rose-900 dark:text-rose-200"
              : "border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        ) : helper ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{helper}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
