# og-satori

`yu9824's Notes` 技術ブログ向けに、URLパラメータで指定されたタイトルや寸法をもとに OGP 画像（SVG / PNG）を動的生成し、Vercel 上で配信するサービスです。[satori](https://github.com/vercel/satori) を活用してシンプルなテンプレートを描画します。

## 特徴

- Vercel Node.js Runtime で動作
- SVG / PNG の両フォーマットに対応
- Noto Sans JP ベースのサブセットフォント（OGSansJP）で日本語を正確に描画
- 画像サイズに応じたレスポンシブスケーリング（短辺基準でデザイントークンを自動調整）
- タイトル・ブログ名のフォントサイズをクエリパラメータ（`titleFontSize` / `siteFontSize`）で個別に上書き可能
- 環境変数による設定の外部化（フォーク・移植が容易）
- TypeScript 実装、全ソースに日本語コメント付き

## クイックスタート

### 前提条件

- Node.js 24.x
- Vercel CLI（ローカル開発・デプロイ用）
- Python 3 + fonttools（**フォントを再生成する場合のみ**。フォントはコミット済みのため通常は不要）

### セットアップ

```bash
# リポジトリのクローン（フォントも含まれる）
git clone https://github.com/yu9824/og-satori.git
cd og-satori

# 依存関係のインストール（resvg.wasm も自動生成される）
npm install

# 環境変数のコピー
cp .env.example .env.local
# 必要に応じて .env.local を編集する（デフォルト値のままでも動作する）

# ローカル開発サーバーの起動
npm run vercel-dev
```

ブラウザで `http://localhost:3000/api/og?title=Hello%20World` を開くと OGP 画像が表示されます。

### テストの実行

```bash
npm test           # ユニットテストを実行
npm run type-check # TypeScript の型チェックを実行
```

## デプロイ

### アセットの供給について

| アセット | 供給方法 | 対応状況 |
|---------|---------|---------|
| `public/resvg.wasm` | `npm install` の `prepare` スクリプトが自動コピー | **自動**（対応不要） |
| フォント `public/fonts/OGSansJP-*.otf` | **git にコミット済み**（合計 約2.3MB） | **自動**（対応不要） |

`resvg.wasm` は `npm install` 実行時に `node_modules/@resvg/resvg-wasm/` から自動的にコピーされます。

フォントは `scripts/subset-fonts.sh` が生成するサブセット成果物ですが、**意図的に git にコミットしています**。git 管理外にすると Vercel の Git 連携デプロイ（checkout された内容のみがビルドされる）にフォントが含まれず、実行時に「フォントが見つからない」で失敗するためです。コミットすることでデプロイ成果物に同梱され、実行時の外部 fetch が不要（＝ネットワーク依存もコールドスタート時の追加レイテンシもなし）になります。

なお `fs.readFile` は `process.cwd()` 起点の動的パスで Next.js のファイルトレースが検出できないため、[next.config.ts](next.config.ts) の `outputFileTracingIncludes` で関数バンドルへの同梱を明示しています。

---

### デプロイ（Git 連携 / Vercel CLI どちらでも可）

フォントはコミット済みなので、追加の手順なしにデプロイできます。

```bash
git push            # Git 連携デプロイ（main への push で Vercel が自動ビルド）、または
vercel --prod       # Vercel CLI デプロイ
```

フォントを更新した場合のみ、再生成して差分をコミットします。

```bash
pip install fonttools brotli   # 初回のみ（Python 3 が必要）
bash scripts/subset-fonts.sh
git add public/fonts/OGSansJP-*.otf && git commit -m "chore: regenerate subset fonts"
```

---

### 環境変数の設定

Vercel ダッシュボードの「Settings > Environment Variables」で以下の環境変数を設定します（すべてオプション）。

## 環境変数一覧

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `SITE_NAME` | `yu9824's Notes` | OGP テンプレートに表示するブログ名 |
| `DEFAULT_WIDTH` | `1200` | デフォルト画像幅（px） |
| `DEFAULT_HEIGHT` | `630` | デフォルト画像高さ（px） |
| `DEFAULT_TEXT_WIDTH_RATIO` | `0.8` | テキストエリアの幅比率（0〜1） |

## クエリパラメータ

エンドポイント: `GET /api/og`

| パラメータ | 型 | デフォルト | 説明 |
|------------|-----|----------|------|
| `title` | string | `''` | 画像に表示するタイトル（URL エンコード、最大 200 文字） |
| `width` | 正の整数 | `1200` | 画像の幅（px） |
| `height` | 正の整数 | `630` | 画像の高さ（px） |
| `textWidth` | 正の整数 | `width × 0.8` | テキスト描画エリアの幅（px） |
| `titleFontSize` | 正の整数 | `56`（自動スケール） | タイトルのフォントサイズ（px）。指定時はレスポンシブスケーリング・最小クランプを適用せず、指定値をそのまま使用する |
| `siteFontSize` | 正の整数 | `28`（自動スケール） | ブログ名ラベルのフォントサイズ（px）。指定時はレスポンシブスケーリング・最小クランプを適用せず、指定値をそのまま使用する |
| `format` | `png` \| `svg` | `png` | 出力フォーマット |

> **フォントサイズの挙動**: `titleFontSize` / `siteFontSize` を**省略**した場合は、既定値（`56` / `28`）に画像短辺基準のスケール係数と最小クランプ（タイトル 16px・ラベル 12px）を適用します。**指定**した場合はスケーリング・クランプを行わず、指定値を実効フォントサイズ（絶対 px）としてそのまま使用します。正の整数以外（0・負数・小数・非数値）は `400`（`INVALID_FONT_SIZE`）を返します。上限は設けていないため、極端に大きな値は画像からはみ出す・レンダリングが遅くなる場合があります。

### 使用例

```
# 基本的な使い方（PNG）
/api/og?title=Next.js%20%E3%81%A7%E4%BD%9C%E3%82%8B%20OGP%20%E7%94%BB%E5%83%8F

# SVG フォーマット
/api/og?title=Hello+World&format=svg

# カスタムサイズ
/api/og?title=My+Post&width=800&height=400

# カスタムテキスト幅
/api/og?title=Long+Title&textWidth=700

# フォントサイズの指定（タイトル 72px・ブログ名 24px）
/api/og?title=Big+Title&titleFontSize=72&siteFontSize=24
```

## デザインのカスタマイズ（色・フォントサイズ・余白）

背景色・文字色・フォントサイズなどの見た目の既定値は、[lib/template.tsx](lib/template.tsx) 先頭の「DESIGN TOKENS」ブロックにまとまっています。該当の定数を編集して再デプロイすると反映されます。

色・余白・アクセントラインは環境変数やクエリパラメータでは変更できません（デザイントークンのみ）。一方、**フォントサイズはリクエストごとにクエリパラメータ `titleFontSize` / `siteFontSize` で上書きできます**（前述の「クエリパラメータ」節を参照）。下表の `TITLE_FONT_SIZE` / `LABEL_FONT_SIZE` は、これらのパラメータを省略したときの既定値です。

| 定数 | デフォルト | 説明 |
|------|-----------|------|
| `BACKGROUND_COLOR` | `#ecf2f5` | 背景色 |
| `TEXT_COLOR` | `#3b3838` | タイトル・本文の文字色 |
| `ACCENT_COLOR` | `#45859c` | アクセントカラー（ブログ名・アクセントライン） |
| `TITLE_FONT_SIZE` | `56` | タイトルの基準フォントサイズ（px）。クエリ `titleFontSize` で上書き可 |
| `LABEL_FONT_SIZE` | `28` | ブログ名ラベルのフォントサイズ（px）。クエリ `siteFontSize` で上書き可 |
| `PADDING` | `64` | 外周の余白（px） |
| `ACCENT_LINE_HEIGHT` | `4` | アクセントラインの高さ（px） |
| `ACCENT_LINE_WIDTH` | `48` | アクセントラインの幅（px） |

> **補足**: フォントサイズ・余白・アクセントラインは画像の短辺（基準 630px）に応じて自動スケーリングされます。上表はデフォルトサイズ（1200×630）での値です。例として `BACKGROUND_COLOR` を `#ffffff` に変更すると背景が白くなります。

## 別のブログへの適用（フォーク手順）

このリポジトリをフォークして別のブログ向けに適用する手順：

1. **リポジトリをフォーク**する
2. **環境変数を変更**する（Vercel の環境変数設定）:
   - `SITE_NAME`: 自分のブログ名に変更
3. **デザインをカスタマイズ**する（任意）: 前述の「デザインのカスタマイズ」節を参照し、[lib/template.tsx](lib/template.tsx) の「DESIGN TOKENS」を編集する
4. **デプロイ**する（フォントはコミット済みのため追加手順は不要）:
   ```bash
   git push   # または vercel --prod
   ```

## フォントについて

`public/fonts/OGSansJP-Regular.otf` / `OGSansJP-Bold.otf` は `scripts/subset-fonts.sh` が生成するサブセット成果物で、**git にコミットされています**（合計 約2.3MB）。通常は再生成不要です。

```bash
# fonttools のインストール（Python 3 が必要）
pip install fonttools brotli

# サブセット生成スクリプトの実行（フォントを更新したいときのみ）
bash scripts/subset-fonts.sh
```

### サブセットの収録範囲

サイズ（git にコミットできる約2.3MB）と豆腐化（グリフ欠落）回避を両立させるため、次を収録しています。

| 種別 | 字数 | 基準 |
|------|------|------|
| 漢字 | 3,065 | [scripts/subset-kanji.txt](scripts/subset-kanji.txt) に列挙。KANJIDIC の grade 1-10（**常用漢字** 2,136 + **人名用漢字** 862）∪ **新聞頻出漢字** |
| CJK 互換漢字 | 362 | `U+F900–U+FAFF`。人名の異体字（`﨑`・`德` 等） |
| かな・記号・ASCII 等 | 629 | ひらがな・カタカナ・句読点・全角/半角記号・Latin-1 |

> **豆腐化した場合**: 上記に含まれない稀な異体字（例: `濵`）はグリフがなく豆腐になります。必要な字を [scripts/subset-kanji.txt](scripts/subset-kanji.txt) に追記して `bash scripts/subset-fonts.sh` を再実行し、生成された `.otf` をコミットしてください。

スクリプトは Noto Sans JP（SIL OFL 1.1）を GitHub Releases からダウンロードし、上記範囲のサブセットを生成します。出力時にフォント名を `OGSansJP` に変更します（`OGSansJP-Regular.otf` / `OGSansJP-Bold.otf`）。なお本フォントの OFL Reserved Font Name は `Source`（Adobe Source Han Sans 由来）であり `Noto` ではないため、改名は OFL 上の義務ではなく、公式 Noto との誤認を避けるための措置です。

## ライセンス

このアプリケーションコードは MIT ライセンスで提供されています。詳細は [LICENSE](LICENSE) を参照してください。

### フォントのライセンス

`scripts/subset-fonts.sh` が生成するフォント（OGSansJP）は Noto Sans JP を改変したものです。

**ベースフォント: Noto Sans JP**
Copyright © 2014-2021 Adobe（Reserved Font Name `Source`）, Copyright © 2014-2021 Google LLC
[SIL Open Font License 1.1](https://scripts.sil.org/OFL)（全文は [public/fonts/OFL.txt](public/fonts/OFL.txt)）
