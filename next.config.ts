import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OG 画像ルートは fs.readFile で public/ 配下のフォントと WASM を読み込む。
  // これらは process.cwd() 起点の動的パスのため Next.js のファイルトレースが検出できず、
  // 明示しないと Vercel の関数バンドルから漏れる可能性がある。
  outputFileTracingIncludes: {
    "/api/og": ["./public/fonts/OGSansJP-*.otf", "./public/resvg.wasm"],
  },
};

export default nextConfig;
