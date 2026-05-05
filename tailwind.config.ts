import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        gradient: "gradient 8s linear infinite",
        shine: "shine 8s linear infinite",
      },
      keyframes: {
        gradient: {
          to: { "background-position": "200% center" },
        },
        shine: {
          from: { "background-position": "0% 0%" },
          to: { "background-position": "300% 300%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
