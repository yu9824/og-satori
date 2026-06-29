import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

/** Vitest の設定ファイル
 * TypeScript ネイティブ対応のテストランナーとして設定する
 */
export default defineConfig({
  // tsx ファイルの JSX 変換を React プラグインで処理する（vitest 4.x 以降で必須）
  plugins: [react()],
  // tsconfig の "@/*" → "./*" に対応させ、ルートハンドラ（@/lib/... を使用）を
  // テストからインポートできるようにする
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    // テスト環境: node (Edge Runtime と互換性のあるテストを書くため)
    environment: "node",
    // TypeScript のグローバル型 (describe, it, expect 等) を自動インポート
    globals: true,
    // テストファイルのパターン
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
