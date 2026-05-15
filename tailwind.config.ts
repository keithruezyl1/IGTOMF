import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fredoka", "system-ui", "sans-serif"],
        body: ["Poppins", "system-ui", "sans-serif"],
      },
      colors: {
        fresh: "#22C55E",
        coral: "#FF6B6B",
        sunny: "#FBBF24",
        sky: "#3B82F6",
        purple: "#A78BFA",
        mint: "#6EE7B7",
        peach: "#FBCFE8",
        cream: "#FFF9F2",
        ink: "#1F2937",
        muted: "#6B7280",
        soft: "#F3F4F6",
      },
      borderRadius: {
        pill: "24px",
        card: "20px",
      },
      boxShadow: {
        card: "0 4px 16px rgba(0, 0, 0, 0.06)",
        cardHover: "0 12px 32px rgba(0, 0, 0, 0.12)",
        button: "0 2px 8px rgba(0, 0, 0, 0.08)",
        glow: "0 0 20px rgba(251, 191, 36, 0.4)",
        modal: "0 20px 60px rgba(0, 0, 0, 0.2)",
      },
      transitionTimingFunction: {
        bouncy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        spring: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        smoothy: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        floatY: {
          "0%, 100%": { transform: "translateY(-12px)" },
          "50%": { transform: "translateY(12px)" },
        },
        wobble: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(251, 191, 36, 0.6)" },
          "50%": { boxShadow: "0 0 0 12px rgba(251, 191, 36, 0)" },
        },
        confetti: {
          "0%": { transform: "translateY(0) rotate(0)", opacity: "1" },
          "100%": { transform: "translateY(120px) rotate(360deg)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        floatY: "floatY 2.5s ease-in-out infinite",
        wobble: "wobble 2s ease-in-out infinite",
        pulseGlow: "pulseGlow 1.6s ease-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
