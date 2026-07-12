import type { Config } from "tailwindcss";

/**
 * ASCEND//SYSTEM design tokens.
 * Dark fantasy + cyber interface: void black base, deep navy surfaces,
 * electric blue + arcane purple energy, gold for legendary, restrained red for danger.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          950: "#04050a",
          900: "#070912",
          800: "#0b0e1c",
          700: "#111528",
        },
        navy: {
          900: "#0d1330",
          800: "#141c44",
          700: "#1c2657",
        },
        arc: {
          // electric blue
          blue: "#39a7ff",
          "blue-dim": "#1f6fd6",
          // arcane purple
          violet: "#8b5cff",
          "violet-dim": "#5f3bd6",
          cyan: "#3ff0e0",
        },
        rank: {
          gold: "#f5c451",
          legendary: "#ff9f45",
          mythic: "#ff5db1",
        },
        danger: "#ff4d5e",
        success: "#3ce8a0",
        warn: "#ffb648",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -2px rgba(57,167,255,0.45)",
        "glow-violet": "0 0 24px -2px rgba(139,92,255,0.5)",
        "glow-gold": "0 0 26px -2px rgba(245,196,81,0.5)",
        panel: "0 8px 40px -12px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        "grid-arc":
          "linear-gradient(rgba(57,167,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(57,167,255,0.06) 1px, transparent 1px)",
        "radial-arc":
          "radial-gradient(circle at 50% 0%, rgba(139,92,255,0.18), transparent 60%)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "float-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        scan: "scan 3s linear infinite",
        "float-up": "float-up 0.4s ease-out",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
