# Project Structure

## Organization Philosophy

レイヤード構成。`lib/` にドメインロジックを単一責務モジュールとして配置し、`app/api/` がそれらを組み合わせてルートハンドラを構成する。

## Directory Patterns

### Domain Logic (`lib/`)
**Purpose**: 副作用のない純粋関数モジュール群。外部から独立してテスト可能。
**Pattern**: ファイル名はドメイン名（`config`, `font`, `params`, `template`, `renderer`）
**Example**: `lib/font.ts` → FontLoader、`lib/params.ts` → ParamParser

### API Route (`app/api/og/route.ts`)
**Purpose**: Node.js Runtime エントリポイント。`lib/` の各モジュールをオーケストレーションする。
**Pattern**: ランタイム宣言なし（デフォルトの Node.js Runtime を使用）
**Example**: config → params → fonts → template → render の順に処理

### Static Assets (`public/`)
**Purpose**: Edge Function 外で静的配信するファイル
**Example**: `public/fonts/NotoSansJP-{Regular,Bold}.otf`、`public/resvg.wasm`

### Tests (`tests/`)
**Purpose**: `lib/` 各モジュールの Vitest ユニットテスト
**Pattern**: `{module}.test.ts(x)`

## Naming Conventions

- **Files**: camelCase（`lib/font.ts`）、ルートハンドラは Next.js 規約（`route.ts`）
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
_Updated: 2026-03-22 (sync: Node.js Runtime 移行反映)_
