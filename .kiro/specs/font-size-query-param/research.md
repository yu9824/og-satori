# Research & Design Decisions

## Summary
- **Feature**: `font-size-query-param`
- **Discovery Scope**: Extension（既存 2 モジュールへのパラメータ追加）
- **Key Findings**:
  - パラメータ解析（`lib/params.ts`）とスケーリング（`lib/template.tsx`）の 2 箇所のみ変更すれば成立し、`app/api/og/route.ts` は無変更で通る（`params` を透過的に受け渡すため）。
  - 既存の `_scaleTokens(scale, width, height)` が `titleFontSize`／`labelFontSize` を一括算出している。条件付きスケーリングはこの関数にオプショナルなオーバーライド引数を追加するだけで実現でき、`?? default` パターン（既存 `params.ts` で多用）と整合する。
  - `truncateTitle` は既に `tokens.titleFontSize` を引数に取るため、実効フォントサイズを `_scaleTokens` で確定すれば折り返し計算（Req 4.5）は追加変更なしで一致する。

## Research Log

### 既存パラメータ解析パターンの確認
- **Context**: 新パラメータ `titleFontSize` / `siteFontSize` をどの粒度・形式で解析・検証するか。
- **Sources Consulted**: `lib/params.ts`、`tests/params.test.ts`、`app/api/og/route.ts`。
- **Findings**:
  - `parseParams` は fail-fast、`isPositiveInteger` で正の整数を検証、省略・空文字はデフォルトにフォールバック。
  - `ValidationError.code` は `INVALID_FORMAT | INVALID_DIMENSION | TITLE_TOO_LONG` のユニオン。
  - 「仕様に定義されていないパラメータ（pattern, fontSize 等）は無視される」と明記されており、`fontSize` は現状無視対象。
- **Implications**: 新パラメータは `OgParams` に**オプショナル**フィールドとして追加し、`undefined`＝未指定を条件付きスケーリングの判別子に使う。エラーコードは精度確保のため `INVALID_FONT_SIZE` を新設。

### スケーリング／クランプの適用箇所
- **Context**: 「指定時はスケール・クランプ非適用、省略時のみ適用」をどこで分岐させるか。
- **Sources Consulted**: `lib/template.tsx`（`_calcScaleFactor` / `_scaleTokens` / `renderTemplate` / `truncateTitle`）。
- **Findings**:
  - `titleFontSize = Math.max(16, TITLE_FONT_SIZE * scale)`、`labelFontSize = Math.max(12, LABEL_FONT_SIZE * scale)` が `_scaleTokens` 内で確定。
  - `renderTemplate` は `tokens.titleFontSize` を描画と `truncateTitle` の両方に渡している。
- **Implications**: `_scaleTokens` にオーバーライド引数を追加し、`override ?? Math.max(clamp, TOKEN * scale)` で分岐。クエリ語彙（`siteFontSize`）→ 内部トークン（`LABEL_FONT_SIZE`／label スロット）への対応を文書化する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. `_scaleTokens` にオーバーライド引数追加 | 指定値を `?? default` で差し込む | 変更が 2 関数に閉じる、既存テスト資産を流用、純粋関数を維持 | `_scaleTokens` のシグネチャ変更 | **採用**。既存パターンと最も整合 |
| B. renderTemplate 内で後付け上書き | `_scaleTokens` 後に上書き | `_scaleTokens` 不変 | スケール／クランプ適用後の値を再計算する二度手間、意図が不明瞭 | 不採用 |
| C. 新トークン解決モジュール新設 | フォントサイズ解決を別モジュール化 | 単一責務が明快 | 小規模機能に対し過剰、レイヤ追加の保守コスト | 不採用（YAGNI） |

## Design Decisions

### Decision: 未指定の判別に `undefined` オプショナルフィールドを使う
- **Context**: 「指定時 vs 省略時」で挙動を変える必要がある（Req 4）。
- **Alternatives Considered**:
  1. `OgParams` に必須 `number` を持たせデフォルト値を埋める — 指定/未指定の区別が失われる。
  2. オプショナル `number | undefined` で未指定を表現 — 区別が保持される。
- **Selected Approach**: `OgParams.titleFontSize?: number`、`OgParams.siteFontSize?: number`。解析時に未指定なら `undefined`。テンプレートが `undefined` を見てスケーリング適用を決定。
- **Rationale**: 条件分岐の判別子をデータ型で表現でき、`?? default` パターンと自然に噛み合う。
- **Trade-offs**: `OgParams` にオプショナルが増えるが、意味は明瞭。
- **Follow-up**: テンプレート側で `undefined` 経路（スケール適用）と値経路（そのまま）の双方をテストする。

### Decision: エラーコード `INVALID_FONT_SIZE` を新設
- **Context**: フォントサイズ検証失敗時の構造化エラー（Req 3.2）。
- **Alternatives Considered**:
  1. 既存 `INVALID_DIMENSION` を流用。
  2. `INVALID_FONT_SIZE` を新設。
- **Selected Approach**: `ValidationError.code` ユニオンに `INVALID_FONT_SIZE` を追加。
- **Rationale**: フォントサイズは寸法（width/height）とは別概念。コードを分けると呼び出し側のエラー判別が明確化。
- **Trade-offs**: ユニオン型の要素が 1 つ増える（影響は型定義のみ）。

### Decision: 上限値は設けない（正の整数のみ）
- **Context**: Open Question 1（上限の要否）。
- **Selected Approach**: 既存 `width`/`height`/`textWidth` と同様、正の整数のみ・上限なし。
- **Rationale**: 既存寸法パラメータと一貫。極端値は呼び出し側責任とし、satori は大きなフォントでも描画自体は破綻しない（はみ出すだけ）。保守コストを増やさない。
- **Trade-offs**: 極端な指定で見栄えが崩れ得るが、これは指定者の意図として許容。

## Risks & Mitigations
- 指定時にクランプを外すため極小値（例: 1px）も通る — バリデーションで 0・負数・小数を排除し、正の整数のみ許可することで最低限の健全性を担保。
- **`truncateTitle` の `charsPerLine=0` 境界**（design レビュー Issue 1）— `truncateTitle` は `charsPerLine = Math.floor(textWidth / fontSize)` を算出する。上限なし方針により `titleFontSize > effectiveTextWidth`（デフォルト textWidth=960 では 961px 以上）が利用者入力で到達可能となり、`charsPerLine=0` → `maxChars=0` → `title.slice(0, -1)` の末尾欠落異常を生む。**Mitigation**: 実装時に `charsPerLine` を `Math.max(1, …)` でクランプ、または `maxChars <= 0` を早期 return で扱い、`titleFontSize > textWidth` の境界テストを追加する。
- `siteFontSize`（クエリ語彙）と `label`（内部トークン）の名称差による混乱 — design.md と JSDoc で対応関係を明記。
- `_scaleTokens` シグネチャ変更による既存呼び出し・テストへの影響 — オーバーライド引数はオプショナルとし、未指定時は現行挙動を完全維持。

## References
- `lib/params.ts` — 既存パラメータ解析・検証パターン
- `lib/template.tsx` — `_calcScaleFactor` / `_scaleTokens` / `truncateTitle`
- `.kiro/steering/tech.md` — 「色・サイズのカスタマイズ方針」（フォントサイズ上書きを許容する方針に更新済み）
