import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm, temple-inspired palette.
        temple: {
          wood: "#6b4a2b",
          woodLight: "#8a6239",
          clay: "#b5693f",
          sand: "#e8dcc5",
          moss: "#5c7a4a",
          gold: "#c9a24a",
          ink: "#2b2119",
        },
      },
      fontFamily: {
        // Pixel-friendly fallback stack; a webfont can be added later.
        pixel: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
