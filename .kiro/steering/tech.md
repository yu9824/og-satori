# Technology Stack

## Architecture

Node.js Runtime シングルエンドポイント。`GET /api/og` が設定読み込み → パラメータ解析 → フォント読み込み → テンプレート生成 → レンダリングを順次実行する。

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

---
_Updated: 2026-03-23 (sync: レスポンシブスケーリングパターン追加)_
