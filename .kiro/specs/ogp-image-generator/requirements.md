# 要件定義書

## プロジェクト概要

`yu9824's Notes` 技術ブログ向けに、URLパラメータで指定されたタイトルや寸法をもとにOGP画像（SVG / PNG）を動的生成し、Vercel上で配信するアプリケーション。satori（HTML/CSS → SVG変換ライブラリ）を活用してシンプルなテンプレートを描画する。

**実装言語:** TypeScript（コメントは日本語で丁寧に記述し、フォーク利用者がカスタマイズしやすくする）

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
2. When the `title` query parameter is absent or empty, the OGP Image Service shall render the image with an empty title area without returning an error.
3. When a request includes a `width` query parameter with a positive integer value, the OGP Image Service shall generate an image with that pixel width.
4. When a request includes a `height` query parameter with a positive integer value, the OGP Image Service shall generate an image with that pixel height.
5. When neither `width` nor `height` is specified, the OGP Image Service shall use the default OGP dimensions of 1200×630 pixels.
6. When a request includes a `textWidth` query parameter with a positive integer value, the OGP Image Service shall constrain the text rendering area to that pixel width.
7. Where the `textWidth` parameter is omitted, the OGP Image Service shall use a default text width that provides reasonable padding relative to the image width.
8. If `width`, `height`, or `textWidth` contains a non-positive or non-integer value, the OGP Image Service shall return HTTP 400 with a descriptive error message.
9. When a request includes a `format` query parameter with value `svg` or `png`, the OGP Image Service shall return the image in the specified format.
10. If the `format` query parameter is present but contains a value other than `svg` or `png`, the OGP Image Service shall return HTTP 400 with an error message indicating the supported values.
11. If the `title` query parameter exceeds 200 characters after URL-decoding, the OGP Image Service shall return HTTP 400 with an error message indicating the character limit.
12. When a request includes query parameters not defined in this specification (e.g., `pattern`, `fontSize`, `textColor` from legacy og-image service), the OGP Image Service shall silently ignore those parameters and proceed with normal rendering.

---

### 要件 3: OGPテンプレートデザイン

**Objective:** ブログ運営者として、`yu9824's Notes` のブランドに合ったシンプルなデザインテンプレートを利用したい。そうすることで、追加の画像編集なしに統一感のあるOGP画像を自動生成できる。

#### 受け入れ基準

1. The OGP Image Service shall render a default template that includes the blog name `yu9824's Notes` as a fixed element.
2. The OGP Image Service shall render the `title` parameter text with sufficient font size to be readable as a social card.
3. When the title text exceeds the allowed `textWidth`, the OGP Image Service shall wrap the text to the next line.
4. When the title text exceeds 3 lines, the OGP Image Service shall truncate the text with an ellipsis (`…`).
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
6. The OGP Image Service shall specify Node.js 24.x as the required runtime engine in `package.json` (`"engines": {"node": "24.x"}`), as it is the current Active LTS version supported by Vercel.

---

### 要件 5: GitHubリポジトリ公開準備

**Objective:** ブログ運営者として、このリポジトリをGitHubに公開できる状態に整えたい。そうすることで、OSS として安全かつ利用者が理解しやすい形でコードを共有できる。

#### 受け入れ基準

1. The OGP Image Service repository shall include a `README.md` at the root that describes the project purpose, usage, required environment variables, and deployment steps.
2. The OGP Image Service repository shall include a `README.md` section with the complete list of supported query parameters and their defaults.
3. The OGP Image Service repository shall include a `.gitignore` file that excludes `node_modules/`, build artifacts (`.next/`, `dist/`, `out/`), environment files (`.env`, `.env*.local`), Vercel local config (`.vercel/`), and editor-specific files.
4. The OGP Image Service repository shall include a `LICENSE` file (MIT license) so that the terms of use are clear to external contributors.
5. The OGP Image Service repository shall not contain any files with secrets, API keys, or personal access tokens in committed history.
6. When a `.env.example` or `.env.local.example` file is present, the OGP Image Service repository shall list all required environment variable names with placeholder values and brief descriptions, without real credentials.
7. The OGP Image Service repository shall include a `.vercelignore` file to exclude development-only files and directories (e.g., test files, documentation source) from Vercel deployment bundles.

---

### 要件 6: 移植性・設定の外部化

**Objective:** ブログ運営者として、ブログ名・フォントURL・デフォルト値などの設定を環境変数や設定ファイルで上書きできるようにしたい。そうすることで、このリポジトリをフォークして別のブログ向けにも容易に流用できる。

#### 受け入れ基準

1. The OGP Image Service shall read the blog name displayed in the template from an environment variable (e.g., `SITE_NAME`), falling back to `yu9824's Notes` when the variable is not set.
2. The OGP Image Service shall read the font file URL(s) from environment variables (e.g., `FONT_URL`), falling back to a bundled or default URL when the variable is not set.
3. The OGP Image Service shall read default image width, height, and text width from environment variables, falling back to the values defined in 要件 2 when not set.
4. When an unsupported environment variable value is provided (e.g., non-numeric default width), the OGP Image Service shall log a warning and use the built-in default instead of throwing an error at startup.
5. The OGP Image Service shall expose a local development server command (e.g., `vercel dev` or equivalent) so that developers can test image generation without deploying to Vercel.
6. The OGP Image Service repository shall include a `README.md` section describing the steps to fork and adapt the service for a different blog, including required environment variable changes.

---

### 要件 7: テスト・CI

**Objective:** ブログ運営者として、プルリクエスト時に自動テストが実行される仕組みを持ちたい。そうすることで、デグレを早期に検知し、OSS としての信頼性を示せる。

#### 受け入れ基準

1. The OGP Image Service shall be implemented in TypeScript, and all source files shall include inline comments written in Japanese to help readers understand and customize the code.
2. The OGP Image Service repository shall include unit tests covering parameter parsing, input validation (including the 200-character title limit, invalid format value rejection, and non-numeric dimension rejection), and unknown-parameter handling.
3. The OGP Image Service repository shall include a GitHub Actions workflow file (`.github/workflows/ci.yml` or equivalent) that runs the unit test suite and TypeScript type-check (`tsc --noEmit`) on every pull request and push to the main branch.
4. When any unit test or type-check fails in the GitHub Actions workflow, the OGP Image Service CI shall report a failing check status on the pull request.
5. The OGP Image Service shall provide an `npm test` (or equivalent) script in `package.json` so that tests can be run locally with a single command.
6. The OGP Image Service GitHub Actions workflow shall run on Node.js 24.x to match the production runtime.
7. The OGP Image Service GitHub Actions CI workflow shall run `npm audit --audit-level=high` and fail the check if any high or critical severity vulnerabilities are detected in dependencies.
8. The OGP Image Service repository shall include a Dependabot configuration file (`.github/dependabot.yml`) that automatically opens pull requests for outdated npm dependencies on a weekly schedule.
9. When Dependabot opens a dependency update pull request, the OGP Image Service CI workflow shall automatically run on that pull request so that test, type-check, and audit results are visible before merging.
