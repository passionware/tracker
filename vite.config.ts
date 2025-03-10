import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3002,
  },
  // @ts-expect-error vite does not expose this type
  test: {
    server: {
      deps: {
        inline: [/@passionware\/.*/],
      },
    },
  },
});
