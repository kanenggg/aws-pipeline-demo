import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        kanit: ["var(--font-kanit)", "sans-serif"],
      },
      colors: {
        white: "#ffffff",
        black: "#000000",
        slate: {
          50: "#f8fafc",
        },
        orange: {
          500: "#f97316",
        },
        emerald: {
          600: "#059669",
        },
      },
    },
  },
  content: ["./app/**/*.{ts,tsx,js,jsx}", "./components/**/*.{ts,tsx,js,jsx}"],
};

export default config;
