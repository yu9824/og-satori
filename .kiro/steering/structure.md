# Project Structure

## Organization Philosophy

レイヤード構成。`lib/` にドメインロジックを単一責務モジュールとして配置し、`app/api/` がそれらを組み合わせてルートハンドラを構成する。

## Directory Patterns

### Domain Logic (`lib/`)
**Purpose**: 副作用のない純粋関数モジュール群。外部から独立してテスト可能。
**Pattern**: ファイル名はドメイン名（`config`, `font`, `params`, `template`, `renderer`）
**Example**: `lib/font.ts` → FontLoader、`lib/params.ts` → ParamParser

### API Routes (`app/api/*/route.ts`)
**Purpose**: Node.js Runtime エントリポイント。`lib/` の各モジュールをオーケストレーションする。
**Pattern**: ランタイム宣言なし（デフォルトの Node.js Runtime を使用）
**Example**: `app/api/og/route.ts` が本番用。config → params → fonts → template → render の順に処理。`app/api/preview-og/route.ts` は同じ流れに色・siteName 等のオーバーライドを足したローカル開発専用版で、冒頭にプロダクションガード（本番では `notFound()`）を持つ。

### Preview Pages (`app/preview/`)
**Purpose**: 生成画像とデザイントークンをブラウザで確認・調整する開発支援 UI。
**Pattern**: `page.tsx`（Server Component）が `loadConfig()` で初期値を解決し、`{Feature}Client.tsx`（`"use client"`）に渡す。`/preview` はガードなし、`/preview/config` はプロダクションガード付き。
**Example**: `app/preview/PreviewClient.tsx`、`app/preview/config/ConfigPreviewClient.tsx`

### Static Assets (`public/`)
**Purpose**: Edge Function 外で静的配信するファイル
**Example**: `public/fonts/OGSansJP-{Regular,Bold}.otf`、`public/resvg.wasm`

### Tests (`tests/`)
**Purpose**: `lib/` 各モジュールおよびルートの Vitest ユニットテスト
**Pattern**: `{module}.test.ts(x)`。ルートテストは `{route}.route.test.ts`。レンダリング結果のスナップショットは `tests/__snapshots__/` に格納

## Naming Conventions

- **Files**: camelCase（`lib/font.ts`）、ルートハンドラ／ページは Next.js 規約（`route.ts`, `page.tsx`）、Client Component は `{Feature}Client.tsx`（PascalCase）
- **Functions**: camelCase、モジュールの責務を動詞+名詞で表現（`loadFonts`, `parseParams`, `renderTemplate`）
- **Interfaces**: PascalCase、用途を表す名詞（`FontData`, `OgParams`, `RenderOptions`）
- **Result Types**: `{ ok: true; data: T } | { ok: false; error/warning: E }` パターンで統一

## Import Organization

```typescript
// 外部ライブラリ
import satori from "satori";
import React from "react";

// 内部モジュール（絶対パス）
import { loadConfig } from "@/lib/config";
import type { FontData } from "@/lib/font";

// 型のみのインポートは import type を使用
import type { AppConfig } from "./config";
```

**Path Aliases**:
- `@/`: プロジェクトルートにマップ（`tsconfig.json` で設定）

## Code Organization Principles

- `lib/` の各モジュールは単一責務。`font.ts` は `AppConfig` に依存せず独立（`fs.readFile` で直接読み込む）。`params.ts` も `AppConfig` に依存しない（`ParamDefaults` という値オブジェクトのみ受け取る）。
- モジュールスコープのミュータブル変数は明示的なキャッシュ目的のみ許容（例：`cachedFonts`）
- テスト用の内部公開関数は `_` プレフィックスで表現（例：`_resetFontCache`）

---
_Updated: 2026-06-30 (sync: プレビュー UI・第2 API ルート・Client/Server 分担反映)_
