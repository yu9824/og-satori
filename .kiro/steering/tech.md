# Technology Stack

## Architecture

Node.js Runtime。本番用の単一エンドポイント `GET /api/og` が設定読み込み → パラメータ解析 → フォント読み込み → テンプレート生成 → レンダリングを順次実行する。これに加えて、`lib/` の同じモジュール群を再利用するローカル開発専用のプレビュー層（`/preview` ページ群と `/api/preview-og`）が独立して存在し、本番エンドポイントには影響しない。

## Core Technologies

- **Language**: TypeScript（strict モード、`jsx: "react-jsx"`）
- **Framework**: Next.js 16+ App Router（`app/api/og/route.ts`）
- **Runtime**: Node.js Runtime（Edge Runtime は不使用）
- **Image Generation**: satori（JSX → SVG）+ @resvg/resvg-wasm（SVG → PNG）
- **Testing**: Vitest 4

## Key Libraries

| ライブラリ | 用途 |
|-----------|------|
| `satori` | JSX を SVG 文字列に変換 |
| `@resvg/resvg-wasm` | SVG を PNG バイト列に変換（WASM、`fs.readFile` で初回のみ読み込み） |
| React 19 | JSX の型定義（`React.ReactElement`）|

## Development Standards

### Type Safety
- `strict: true`、`any` 禁止
- 結果型は `{ ok: true; data: T } | { ok: false; error: E }` のディスクリミネーテッドユニオンで表現

### Code Quality
- モジュール先頭に JSDoc コメント（日本語）
- 純粋関数・副作用最小化：`lib/` の各モジュールは参照透過性を持つ
- モジュールスコープのキャッシュ変数（例：`cachedFonts`）でウォームリクエストの再フェッチを回避

### Testing
- `tests/` に Vitest ユニットテスト
- `npm test` / `npm run type-check`
- レンダリング出力の回帰検知はスナップショットテスト（`tests/__snapshots__/`）を使用

## Development Environment

### Required Tools
- Node.js 24.x

### Common Commands
```bash
# Dev
npm run dev          # Next.js 開発サーバー起動

# Test
npm test             # Vitest ユニットテスト
npm run type-check   # tsc 型チェック
```

## Key Technical Decisions

### next/og を使わない理由
next/og は内部で satori を重複バンドルするため、Edge Function の 1 MB 制限を超える。satori を直接呼び出し、resvg-wasm は `public/resvg.wasm` として静的配信することでバンドルサイズを削減。

### フォント・WASM の読み込み
`lib/font.ts` と `lib/renderer.ts` は `fs.readFile` を使って `public/fonts/` および `public/resvg.wasm` を直接読み込む（Node.js Runtime のみ）。モジュールスコープのキャッシュ変数でウォームリクエスト時の再読み込みを回避する。

Edge Runtime は非対応。理由：大容量 WASM（2.4MB）のロードに `import.meta.url` が機能せず、HTTP セルフフェッチはポリフィル `Response` と Node.js ネイティブ `WebAssembly.instantiateStreaming` の非互換を引き起こすため。

### satori の CSS 制約
- Flexbox のみ（Grid 非対応）
- `calc()` 非対応
- WOFF2 非対応 → OTF/TTF を使用

### テンプレートのレスポンシブスケーリング
`lib/template.tsx` は画像の短辺を基準（`BASE_SHORT_SIDE = 630`）としたスケール係数でデザイントークンを動的にスケーリングする。
- `_calcScaleFactor(width, height)` → `min(width, height) / BASE_SHORT_SIDE`
- `_scaleTokens(scale, width, height)` → パディング・フォントサイズ等をクランプ付きでスケーリング

### ローカルプレビュー層と本番の分離
プレビュー機能（色・siteName・baseShortSide のオーバーライド）は本番エンドポイント `/api/og` に露出させない。開発専用のルート（`/api/preview-og`、`/preview/config`）は冒頭で `if (process.env.NODE_ENV === "production") notFound();` のプロダクションガードを置き、本番では 404 を返す。`/preview`（画像確認ページ）のみガードなしで本番でも動作する。色オーバーライドは `lib/template.tsx` の `ColorOverrides` 型（`renderTemplate` の `colorOverrides`）経由で渡す。

### Server / Client Component の分担
プレビューページは React Server Component（`page.tsx`）が `loadConfig()` で初期値を解決し、`"use client"` を付けた `*Client.tsx`（`PreviewClient` / `ConfigPreviewClient`）が対話 UI を担う。バリデーションはクライアント側に委ね、Server 側は型変換のみ行う。

---
_Updated: 2026-06-30 (sync: ローカルプレビュー層・Server/Client 分担・スナップショットテスト追加)_
