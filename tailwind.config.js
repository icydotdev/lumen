/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/client/**/*.{ts,tsx,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        lumen: {
          accent: "#8b5cf6",
          green: "#22c55e",
          red: "#ef4444",
          yellow: "#eab308",
          amber: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
