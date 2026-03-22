# Requirements Document

## Project Description (Input)
レスポンシブデザイン対応したテンプレートにしたいです。余白などがハードコーディングされており、現在の1200*630なら問題ないですが、たとえば、400*210 pxや 630*630など可能な限り様々なサイズでも対応可能なテンプレートにしたいです。

## Introduction

現在の `lib/template.tsx` では、余白（`PADDING = 64`）・フォントサイズ（`TITLE_FONT_SIZE = 56`、`LABEL_FONT_SIZE = 28`）・アクセントライン寸法などのデザイントークンがすべて固定値としてハードコーディングされている。基準サイズ（1200×630）では問題ないが、小サイズ（400×210）や正方形（630×630）などでは余白・文字が大きすぎてレイアウトが崩れる。本機能は、これらのトークンを画像寸法に比例したスケーリング値に置き換え、任意のサイズで視覚的に整合した OGP 画像を生成できるようにすることを目的とする。

## Requirements

### Requirement 1: デザイントークンのスケーリング

**Objective:** As a ブログ運営者, I want 画像サイズに比例してフォントサイズ・余白・アクセントライン寸法が自動調整される機能, so that 400×210〜1200×630 など任意の解像度で見た目が崩れない OGP 画像を得られる。

#### Acceptance Criteria

1. When `renderTemplate` が `width` と `height` を持つ `OgParams` を受け取ったとき, the Template Renderer shall 参照解像度（1200×630）に対するスケール係数を算出し、`PADDING`・`TITLE_FONT_SIZE`・`LABEL_FONT_SIZE`・`ACCENT_LINE_HEIGHT`・`ACCENT_LINE_WIDTH` の各値にそのスケール係数を乗算した値を使用する。
2. The Template Renderer shall スケール係数の算出に画像の短辺（`min(width, height)`）を用いることで、縦長・横長・正方形いずれのアスペクト比でも極端に大きな値が適用されないようにする。
3. The Template Renderer shall スケーリング後の各トークンに下限値（最小値）を設けることで、極小サイズでも要素が消滅・重複しないようにする。
4. When `width=400` かつ `height=210` のとき, the Template Renderer shall `PADDING` が基準値 64px 未満の値になる（スケールが適用されている）ことを保証する。
5. When `width=1200` かつ `height=630` のとき, the Template Renderer shall スケール係数が 1.0 となり、既存のデザイントークンと同等の値が使用される。

---

### Requirement 2: テキスト折り返しのスケーリング連動

**Objective:** As a ブログ運営者, I want フォントサイズがスケーリングされた場合でもタイトルの省略ロジックが正しく動作すること, so that 小サイズ画像でも正しい文字数でタイトルが切り詰められる。

#### Acceptance Criteria

1. When フォントサイズがスケーリングされたとき, the Template Renderer shall `truncateTitle` に渡す文字数上限（`charsPerLine`）をスケーリング後のフォントサイズと `textWidth` を使って再計算する。
2. The Template Renderer shall スケーリング後の `TITLE_FONT_SIZE` が `0` にならないことを保証する（ゼロ除算の防止）。
3. If `textWidth` が `0` 以下になる場合, the Template Renderer shall `textWidth` を `1` にクランプしタイトルを空文字として処理する。

---

### Requirement 3: アスペクト比の多様性への対応

**Objective:** As a ブログ運営者, I want 横長（例: 1200×630）・小型横長（例: 400×210）・正方形（例: 630×630）のいずれのアスペクト比でもレイアウトが維持されること, so that SNS プラットフォームごとに異なるサイズ要件に対応できる。

#### Acceptance Criteria

1. While アスペクト比が 16:9 近辺（例: 400×210）のとき, the Template Renderer shall タイトルエリアとフッターエリアが重ならずに表示される。
2. While アスペクト比が 1:1（例: 630×630）のとき, the Template Renderer shall タイトルエリアとフッターエリアが重ならずに表示される。
3. The Template Renderer shall 余白（`PADDING`）がスケーリングされた後でも、左右合計が `width` の 50% を超えないようにクランプする。
4. The Template Renderer shall 上下余白の合計が `height` の 50% を超えないようにクランプする。

---

### Requirement 4: 後方互換性の維持

**Objective:** As a ブログ運営者, I want 既存のクエリパラメータ仕様が変更されないこと, so that 既存の `<meta property="og:image">` URL を修正せずに継続利用できる。

#### Acceptance Criteria

1. The Template Renderer shall `renderTemplate(input: RenderInput)` の関数シグネチャを変更しない。
2. The Template Renderer shall `OgParams`・`AppConfig` の型定義を変更しない。
3. When `width` と `height` が省略された場合（デフォルト 1200×630 が適用される場合）, the Template Renderer shall スケール係数が 1.0 となり、従来と視覚的に同等の出力を返す。

---

### Requirement 5: テスト可能性

**Objective:** As a 開発者, I want スケーリングロジックが独立してテスト可能であること, so that 各サイズでの期待値を Vitest でユニットテストできる。

#### Acceptance Criteria

1. The Template Renderer shall スケール係数の算出ロジックを、テスト用に公開された純粋関数（または `_` プレフィックスの内部公開関数）として実装する。
2. When `width=400, height=210` を入力したとき, the Template Renderer shall スケール係数が `min(400, 210) / min(1200, 630)` ＝ `210 / 630` ≈ `0.333` となる値を返す。
3. When `width=630, height=630` を入力したとき, the Template Renderer shall スケール係数が `min(630, 630) / min(1200, 630)` ＝ `630 / 630` ＝ `1.0` となる値を返す。
