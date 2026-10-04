// scripts/lib の純粋関数のテスト（pnpm test:scripts。pnpm check の test:scripts 工程からも実行される）
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: join(dirname(fileURLToPath(import.meta.url)), ".."),
    include: ["scripts/**/*.test.mjs"],
  },
});
