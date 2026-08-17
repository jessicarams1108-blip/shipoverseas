import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#f2f9ff",
          500: "#0ea5e9",
          700: "#0369a1",
          900: "#0c4a6e"
        },
        /** Brand navy aligned with marine marketing mocks */
        marine: {
          50: "#e6f4f9",
          400: "#4ea3c7",
          500: "#0078a8",
          600: "#006994",
          700: "#005682",
          800: "#004266",
          900: "#002a40"
        }
      }
    }
  },
  plugins: []
};

export default config;
