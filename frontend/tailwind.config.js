/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF9F6",
        surface: "#FFFFFF",
        ink: {
          900: "#1C1A17",
          700: "#4A463F",
          500: "#7A7468",
          300: "#B8B2A5",
        },
        line: "#E7E2D8",
        accent: {
          DEFAULT: "#2F5D50",
          hover: "#254A40",
          soft: "#E4EEEA",
        },
        status: {
          pending: "#B8862B",
          pendingSoft: "#FBF1DF",
          approved: "#2F6B3A",
          approvedSoft: "#E7F3E8",
          rejected: "#A23B32",
          rejectedSoft: "#FBEAE7",
          processing: "#3D5A80",
          processingSoft: "#E8EEF6",
        },
      },
      fontFamily: {
        sans: ["'Inter var'", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["'Source Serif 4'", "Georgia", "serif"],
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(28, 26, 23, 0.06)",
        card: "0 1px 3px rgba(28, 26, 23, 0.08), 0 1px 2px rgba(28, 26, 23, 0.04)",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "14px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "fade-in": "fade-in 0.25s ease-out both",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
