# 要件定義書

## プロジェクト概要

`yu9824's Notes` 技術ブログ向けに、URLパラメータで指定されたタイトルや寸法をもとにOGP画像（SVG / PNG）を動的生成し、Vercel上で配信するアプリケーション。satori（HTML/CSS → SVG変換ライブラリ）を活用してシンプルなテンプレートを描画する。

## 要件

### 要件 1: 画像エンドポイント

**Objective:** ブログ運営者として、HTTPリクエスト1回でOGP画像を取得したい。そうすることで、`<meta property="og:image">` タグや `<img>` タグにURLを直接指定できる。

#### 受け入れ基準

1. The OGP Image Service shall provide an HTTP GET endpoint at `/api/og` (or equivalent Vercel Function path) that returns an image response.
2. When a request is received, the OGP Image Service shall respond with `Content-Type: image/svg+xml` for SVG format or `Content-Type: image/png` for PNG format.
3. When no format parameter is specified, the OGP Image Service shall default to returning a PNG image.
4. The OGP Image Service shall set appropriate cache headers (`Cache-Control`) to enable edge caching on Vercel CDN.
5. If the rendering process fails, the OGP Image Service shall return HTTP 500 with a plain-text error message.

---

### 要件 2: URLパラメータによる画像カスタマイズ

**Objective:** ブログ運営者として、URLクエリパラメータで画像のタイトルや寸法を指定したい。そうすることで、ページごとに異なるOGP画像を1つのエンドポイントで生成できる。

#### 受け入れ基準

1. When a request includes a `title` query parameter, the OGP Image Service shall render the decoded title text in the image.
2. When a request includes a `width` query parameter with a positive integer value, the OGP Image Service shall generate an image with that pixel width.
3. When a request includes a `height` query parameter with a positive integer value, the OGP Image Service shall generate an image with that pixel height.
4. When neither `width` nor `height` is specified, the OGP Image Service shall use the default OGP dimensions of 1200×630 pixels.
5. When a request includes a `textWidth` query parameter with a positive integer value, the OGP Image Service shall constrain the text rendering area to that pixel width.
6. Where the `textWidth` parameter is omitted, the OGP Image Service shall use a default text width that provides reasonable padding relative to the image width.
7. If `width`, `height`, or `textWidth` contains a non-positive or non-integer value, the OGP Image Service shall return HTTP 400 with a descriptive error message.
8. When a request includes a `format` query parameter with value `svg` or `png`, the OGP Image Service shall return the image in the specified format.

---

### 要件 3: OGPテンプレートデザイン

**Objective:** ブログ運営者として、`yu9824's Notes` のブランドに合ったシンプルなデザインテンプレートを利用したい。そうすることで、追加の画像編集なしに統一感のあるOGP画像を自動生成できる。

#### 受け入れ基準

1. The OGP Image Service shall render a default template that includes the blog name `yu9824's Notes` as a fixed element.
2. The OGP Image Service shall render the `title` parameter text with sufficient font size to be readable as a social card.
3. When the title text exceeds the allowed `textWidth`, the OGP Image Service shall wrap the text to the next line.
4. When the title text exceeds a maximum number of lines, the OGP Image Service shall truncate the text with an ellipsis (`…`).
5. The OGP Image Service shall apply a visually consistent background and typography style suited for a technical blog.
6. The OGP Image Service shall embed or load the required font(s) so that Japanese and English characters render correctly in all environments.

---

### 要件 4: Vercelデプロイ対応

**Objective:** ブログ運営者として、このアプリをVercelにデプロイし、エッジ / サーバーレス環境で安定稼働させたい。そうすることで、ブログから直接URLで参照できる。

#### 受け入れ基準

1. The OGP Image Service shall operate as a Vercel Serverless Function or Edge Function without requiring a persistent server.
2. The OGP Image Service shall complete image generation and respond within Vercel's function timeout limit (default 10 seconds for Serverless, 30 seconds budget for Edge).
3. While running on Vercel Edge Runtime, the OGP Image Service shall use only Web-standard APIs and libraries compatible with that runtime.
4. The OGP Image Service shall not rely on local file system access for fonts or assets at runtime; all required assets shall be bundled or fetched via URL.
5. If the required font cannot be loaded, the OGP Image Service shall fall back to a system font and log a warning rather than returning an error.
