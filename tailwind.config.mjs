
/**
 * Design system mapping. All colors reference the CSS custom properties
 * defined in globals.css so the palette lives in exactly one place.
 */
/** @type {import("tailwindcss").Config} */
const config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          hover: "hsl(var(--primary-hover) / <alpha-value>)",
          subtle: "hsl(var(--primary-subtle) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          subtle: "hsl(var(--danger-subtle) / <alpha-value>)",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 40 50 / 0.05)",
        "card-hover": "0 4px 12px 0 rgb(15 40 50 / 0.08)",
        panel: "0 12px 32px 0 rgb(15 40 50 / 0.16)",
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
