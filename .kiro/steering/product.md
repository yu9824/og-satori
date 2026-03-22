# Product Overview

URL パラメータで指定されたタイトル・寸法を元に OGP 画像（SVG / PNG）を動的生成し、Vercel 上で配信するサービス。`yu9824's Notes` 技術ブログ向けに設計されているが、環境変数の変更だけで別ブログへのフォークが可能。

## Core Capabilities

- `GET /api/og?title=...` で SVG または PNG を即時返却
- Noto Sans JP（Regular / Bold）で日本語を正確に描画
- 幅・高さ・テキスト幅をクエリパラメータで動的指定
- 環境変数による設定外部化（ブログ名、画像サイズ等）
- デザイントークン（色、フォントサイズ、余白）を `lib/template.tsx` 先頭にまとめて、フォーク時のカスタマイズを容易化

## Target Use Cases

- ブログ記事の `<meta property="og:image">` として埋め込む OGP 画像の動的生成
- 別ブログへのフォーク：環境変数とデザイントークンを変更するだけで移植可能

## Value Proposition

- next/og を使わず satori + @resvg/resvg-wasm を直接呼び出すことで、バンドルサイズを削減
- Node.js Runtime で動作し、`fs.readFile` によるフォント・WASM の安定読み込みを実現
- OTF フォントを `public/fonts/` に同梱し、外部 CDN 依存なしで日本語描画

---
_Updated: 2026-03-22 (sync: Node.js Runtime 移行反映)_
