# Research & Design Decisions

---
**Purpose**: `responsive-template` フィーチャーのディスカバリー記録と設計判断の根拠。

---

## Summary

- **Feature**: `responsive-template`
- **Discovery Scope**: Extension（既存 `lib/template.tsx` の内部ロジック変更）
- **Key Findings**:
  - 変更ファイルは `lib/template.tsx` 単体。外部ライブラリ・API の追加は不要。
  - `truncateTitle` がモジュールスコープの定数 `TITLE_FONT_SIZE` を直接参照しているため、スケーリング後の値を渡せるようシグネチャ変更が必要。
  - テスト側（`tests/template.test.tsx`）の `AppConfig` フィールドが現行の `lib/config.ts` と乖離している（`baseUrl` 等の余分フィールドが存在）。スナップショットの再生成が必要になる点を実装時に注意。

## Research Log

### 既存コードベースの統合ポイント分析

- **Context**: `renderTemplate` のシグネチャを変更せずにスケーリングを導入する方法を確認
- **Sources Consulted**: `lib/template.tsx`、`lib/config.ts`、`lib/params.ts`、`tests/template.test.tsx`
- **Findings**:
  - `renderTemplate(input: RenderInput)` はシグネチャを変更しない（要件 4.1）。`RenderInput.params.width/height` からスケール係数を算出できる。
  - `truncateTitle` は現在 `textWidth` と モジュール定数 `TITLE_FONT_SIZE` を使用。スケール後のフォントサイズを受け取るには第 3 引数 `fontSize: number` を追加する必要がある（モジュール内部のみで使用するプライベート関数のため後方互換性への影響なし）。
  - `_calcScaleFactor` を `export` することで Vitest から直接テスト可能にする（既存の `_resetFontCache` パターンと同様）。
- **Implications**:
  - `renderTemplate` の外部 API は変わらないため、`app/api/og/route.ts` への変更は不要。
  - スナップショットは再生成が必要（デザイントークンの値が変わるため）。

### スケール係数の算出方式の検討

- **Context**: 横長・縦長・正方形で極端な値が出ないスケール係数の選定
- **Findings**:
  - `short_side = min(width, height)` を基準とすることで、いずれのアスペクト比でも短辺がトークンを支配しない。
  - 基準短辺 = `min(1200, 630) = 630`。
  - 例: `400×210` → `min(400, 210) / 630 = 210/630 ≈ 0.333`
  - 例: `630×630` → `630 / 630 = 1.0`
  - 例: `1200×630` → `630 / 630 = 1.0`（既存動作と完全一致）
- **Implications**: 正方形サイズは短辺がそのまま基準となるため、過剰なスケールアップにならない。

### PADDING クランプの上限設計

- **Context**: 極端に小さい画像での余白の算出超過を防ぐ
- **Findings**:
  - 左右余白合計 = `padding * 2`。これが `width * 0.5` を超えるとコンテンツ幅がゼロになる。
  - 上下余白合計 = `padding * 2`。これが `height * 0.5` を超えるとコンテンツ高さがゼロになる。
  - したがって `scaledPadding = Math.min(PADDING * scale, width * 0.25, height * 0.25)` とすれば左右合計・上下合計いずれも 50% 以内に収まる。
- **Implications**: 単一の `scaledPadding` 値で左右・上下共通の余白とするため、width と height 双方の 25% を上限として取る（より厳しい方を選択）。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations |
|--------|-------------|-----------|---------------------|
| 内部スケール関数追加（採用） | `_calcScaleFactor` を純粋関数として追加し、`renderTemplate` 内でトークンをスケール | 既存シグネチャ不変、テスト容易、変更範囲最小 | なし |
| デザイントークンを動的プロパティ化 | `RenderInput` に `tokens` フィールドを追加して外部注入 | 柔軟性高い | シグネチャ変更が必要（要件 4.1 違反）|
| CSS `transform: scale()` | コンテナ全体を CSS スケール | 実装が簡単 | satori は `transform` 非対応 |

## Design Decisions

### Decision: `_calcScaleFactor` の export

- **Context**: 要件 5.1 でスケーリングロジックが独立してテスト可能であることを要求
- **Alternatives Considered**:
  1. 非公開のまま（テスト不可）
  2. `export` して Vitest から直接アクセス（採用）
- **Selected Approach**: `export function _calcScaleFactor(width: number, height: number): number` として公開（既存の `_resetFontCache` パターンと統一）
- **Rationale**: `_` プレフィックスでテスト専用と明示しつつ、外部から直接テスト可能
- **Trade-offs**: モジュール外部から呼び出し可能になるが、慣習的な `_` プレフィックスで意図を明示
- **Follow-up**: `tests/template.test.tsx` に `_calcScaleFactor` のユニットテストを追加

### Decision: `truncateTitle` への `fontSize` パラメータ追加

- **Context**: スケーリング後のフォントサイズで文字数上限を再計算するために必要（要件 2.1）
- **Alternatives Considered**:
  1. グローバル定数のまま（スケーリングと不整合）
  2. `fontSize` を第 3 引数として追加（採用）
- **Selected Approach**: `function truncateTitle(title: string, textWidth: number, fontSize: number): string`
- **Rationale**: プライベート関数のため後方互換性への影響なし。テスト側でも呼び出し元の `renderTemplate` を通じて検証する。
- **Trade-offs**: なし（スコープが `lib/template.tsx` 内部のみ）

## Risks & Mitigations

- スナップショットテストの破壊 — `npm test -- --update-snapshots` で再生成する（実装タスクに含める）
- テスト側の `AppConfig` フィールド乖離（`baseUrl` 等）— スナップショット再生成時に `lib/config.ts` の現行定義に合わせて修正する
- 極小サイズでのフォントクランプ後もフッターがタイトルエリアに重なる可能性 — PADDING クランプ（25% 上限）により物理的に防止される

## References

- `lib/template.tsx` — スケーリング対象の現行テンプレート実装
- `lib/config.ts` — `AppConfig` の現行定義（`baseUrl` 等はすでに削除済み）
- `tests/template.test.tsx` — スナップショットテストの現行実装
