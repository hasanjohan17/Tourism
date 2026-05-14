/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#17212b",
        marine: "#0f5e6e",
        jade: "#159a8c",
        saffron: "#d99f3d",
        linen: "#f8f4ed",
        mist: "#e8f1ef",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        subtleFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        revealSoft: {
          "0%": { opacity: "0", transform: "translateY(18px)", filter: "blur(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        gentleScale: {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        borderPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(21, 154, 140, 0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(21, 154, 140, 0)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scaleIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "subtle-float": "subtleFloat 5s ease-in-out infinite",
        "reveal-soft": "revealSoft 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "gentle-scale": "gentleScale 0.65s cubic-bezier(0.22, 1, 0.36, 1) both",
        "border-pulse": "borderPulse 2.8s ease-in-out infinite",
      },
      boxShadow: {
        soft: "0 22px 70px rgba(23, 33, 43, 0.12)",
        lift: "0 18px 42px rgba(15, 94, 110, 0.18)",
      },
    },
  },
  plugins: [],
};
