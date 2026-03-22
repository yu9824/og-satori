# og-satori

`yu9824's Notes` 技術ブログ向けに、URLパラメータで指定されたタイトルや寸法をもとに OGP 画像（SVG / PNG）を動的生成し、Vercel 上で配信するサービスです。[satori](https://github.com/vercel/satori) を活用してシンプルなテンプレートを描画します。

## 特徴

- Vercel Node.js Runtime で動作
- SVG / PNG の両フォーマットに対応
- Noto Sans JP ベースのサブセットフォント（OGSansJP）で日本語を正確に描画
- 環境変数による設定の外部化（フォーク・移植が容易）
- TypeScript 実装、全ソースに日本語コメント付き

## クイックスタート

### 前提条件

- Node.js 24.x
- Vercel CLI（ローカル開発・デプロイ用）
- Python 3 + fonttools（フォント生成用）

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/yu9824/og-satori.git
cd og-satori

# 依存関係のインストール
npm install

# フォントの生成（初回のみ）
pip install fonttools brotli
bash scripts/subset-fonts.sh

# 環境変数のコピー
cp .env.example .env.local
# .env.local を編集して必要な値を設定する

# ローカル開発サーバーの起動
npm run vercel-dev
```

ブラウザで `http://localhost:3000/api/og?title=Hello+World` を開くと OGP 画像が表示されます。

### テストの実行

```bash
npm test           # ユニットテストを実行
npm run type-check # TypeScript の型チェックを実行
```

## デプロイ

フォントは git 管理外のため、デプロイ前にローカルで生成しておく必要があります。

```bash
# フォント未生成の場合
bash scripts/subset-fonts.sh

# Vercel CLI でデプロイ
vercel --prod
```

### 環境変数の設定

Vercel ダッシュボードの「Settings > Environment Variables」で以下の環境変数を設定します。

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
| `format` | `png` \| `svg` | `png` | 出力フォーマット |

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
```

## 別のブログへの適用（フォーク手順）

このリポジトリをフォークして別のブログ向けに適用する手順：

1. **リポジトリをフォーク**する
2. **環境変数を変更**する（Vercel の環境変数設定）:
   - `SITE_NAME`: 自分のブログ名に変更
3. **デザインをカスタマイズ**する（任意）:
   - [lib/template.tsx](lib/template.tsx) の先頭にある「DESIGN TOKENS」ブロックの定数を変更する
   - `BACKGROUND_COLOR`, `TEXT_COLOR`, `ACCENT_COLOR`, `TITLE_FONT_SIZE` など
4. **フォントを生成してデプロイ**する:
   ```bash
   bash scripts/subset-fonts.sh
   vercel --prod
   ```

## フォントについて

`public/fonts/` 以下のフォントファイルは git 管理外です。`scripts/subset-fonts.sh` を実行して生成します。

```bash
# fonttools のインストール（Python 3 が必要）
pip install fonttools brotli

# サブセット生成スクリプトの実行
bash scripts/subset-fonts.sh
```

スクリプトは Noto Sans JP（SIL OFL 1.1）をベースに、日本語・ASCII 文字のサブセットを生成し、フォント名を `OGSansJP` に変更して出力します（OFL の Reserved Font Name "Noto" を回避するため）。

## ライセンス

このアプリケーションコードは MIT ライセンスで提供されています。詳細は [LICENSE](LICENSE) を参照してください。

### フォントのライセンス

`scripts/subset-fonts.sh` が生成するフォント（OGSansJP）は Noto Sans JP を改変したものです。

**ベースフォント: Noto Sans JP**
Copyright © Google LLC and the Noto Authors
[SIL Open Font License 1.1](https://scripts.sil.org/OFL)
