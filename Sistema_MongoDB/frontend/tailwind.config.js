/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primárias
        primary: {
          50: "#F0F6FF",
          100: "#E0ECFF",
          200: "#BAD9FF",
          300: "#7EB3FF",
          400: "#4B7FFF",
          500: "#2E5FDB",
          600: "#1E40AF",
          700: "#1F3A93",
          800: "#1E3A8A",
          900: "#1B2E5C",
        },
        // Secundárias
        success: "#10B981",
        warning: "#F97316",
        error: "#EF4444",
        info: "#FBBF24",
        // Neutros
        neutral: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
      },
      backgroundColor: {
        light: "#F8FAFC",
        "card-light": "#FFFFFF",
      },
      textColor: {
        primary: "#111827",
        secondary: "#374151",
        light: "#6B7280",
      },
      borderColor: {
        light: "#E5E7EB",
        primary: "#4B7FFF",
      },
      boxShadow: {
        "soft": "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
        "card": "0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)",
        "elevated": "0 10px 25px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
}