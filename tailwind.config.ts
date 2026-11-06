import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          subtle: "var(--surface-subtle)",
          muted: "var(--surface-muted)",
        },
        border: "var(--border)",
        divider: "var(--divider)",
        ring: "var(--ring)",
        brand: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
          DEFAULT: "#0f172a",
        },
        accent: {
          DEFAULT: "var(--accent)",
          subtle: "var(--accent-subtle)",
          foreground: "var(--accent-foreground)",
        },
        status: {
          lunas: {
            bg: "var(--status-lunas-bg)",
            text: "var(--status-lunas-text)",
            dot: "var(--status-lunas-dot)",
            border: "var(--status-lunas-border)",
          },
          belum: {
            bg: "var(--status-belum-bg)",
            text: "var(--status-belum-text)",
            dot: "var(--status-belum-dot)",
            border: "var(--status-belum-border)",
          },
          tunggakan: {
            bg: "var(--status-tunggakan-bg)",
            text: "var(--status-tunggakan-text)",
            dot: "var(--status-tunggakan-dot)",
            border: "var(--status-tunggakan-border)",
          },
          beasiswa: {
            bg: "var(--status-beasiswa-bg)",
            text: "var(--status-beasiswa-text)",
            dot: "var(--status-beasiswa-dot)",
            border: "var(--status-beasiswa-border)",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          "Inter",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
