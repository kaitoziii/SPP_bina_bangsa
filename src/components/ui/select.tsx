"use client";

import React, { forwardRef } from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  options?: { value: string | number; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helper, options, children, className = "", id, ...props }, ref) => {
    const selectId = id || props.name || Math.random().toString(36).substring(7);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full h-9 px-3 text-sm bg-white dark:bg-zinc-900 border rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-800 ${
            error
              ? "border-rose-500 text-rose-900 dark:text-rose-200"
              : "border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        ) : helper ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{helper}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
