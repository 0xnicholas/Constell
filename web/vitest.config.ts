import path from "path";
import { defineConfig } from "vitest/config";

process.env.REDIS_AUTH = process.env.REDIS_AUTH || "myredissecret";

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.servertest.ts"],
    exclude: ["node_modules", ".next"],
  },
});
