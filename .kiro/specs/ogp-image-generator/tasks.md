# Implementation Plan

- [ ] 1. プロジェクトの初期設定
- [ ] 1.1 Next.js と TypeScript の環境を構築する
  - Next.js 15.x App Router を TypeScript strict モードで初期化する
  - satori と next/og を本番依存関係として追加する
  - Vitest をテスト依存関係として追加し、vitest.config.ts を作成する
  - tsconfig.json に strict: true と Edge Runtime 互換の設定を加える
  - 全ソースファイルに日本語コメントを記述するコーディング規約を確立する
  - _Requirements: 4.3, 7.1_

- [ ] 1.2 package.json のスクリプトとエンジン要件を整備する
  - engines フィールドに `"node": "24.x"` を指定する
  - `npm test`（vitest run）、`npm run type-check`（tsc --noEmit）、`npm run dev`（next dev）スクリプトを定義する
  - vercel を devDependencies に追加し `npm run vercel-dev`（vercel dev）スクリプトを定義する
  - _Requirements: 4.6, 6.5, 7.5_

- [ ] 2. 基盤コンポーネントの実装
- [ ] 2.1 (P) 環境変数から設定値を読み込む機能を実装する
  - SITE_NAME、FONT_URL_REGULAR、FONT_URL_BOLD、FONT_FETCH_TIMEOUT_MS を読み込む
  - DEFAULT_WIDTH、DEFAULT_HEIGHT、DEFAULT_TEXT_WIDTH_RATIO を読み込む
  - NEXT_PUBLIC_BASE_URL → VERCEL_URL → 'http://localhost:3000' の順で baseUrl を解決する（VERCEL_URL には https:// を付与）
  - フォントのデフォルト URL は `${baseUrl}/fonts/NotoSansJP-{Regular,Bold}.otf` として絶対 URL を構築する
  - 不正な数値型環境変数はコンソール警告を出してデフォルト値にフォールバックする
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 2.2 (P) URLクエリパラメータを解析・バリデーションする機能を実装する
  - `ParamDefaults`（width, height, textWidthRatio）を受け取り `OgParams` または `ValidationError` を返す純粋関数として実装する（AppConfig には依存しない）
  - title、width、height、textWidth、format の各パラメータを解析する
  - title が省略または空文字の場合はデフォルトで空文字を返す
  - title が URL デコード後 200 文字を超える場合は TITLE_TOO_LONG エラーを返す
  - width、height、textWidth が正の整数でない場合は INVALID_DIMENSION エラーを返す
  - format が `svg` / `png` 以外の場合は INVALID_FORMAT エラーを返す
  - 仕様に定義されていないパラメータ（pattern, fontSize 等）は無視して処理を続行する
  - RequestHandler 側で `AppConfig` から `ParamDefaults` を抽出して渡す
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12_

- [ ] 3. フォントサブセット生成とライセンス対応
- [ ] 3.1 Noto Sans JP のサブセット生成スクリプトを作成する
  - `scripts/subset-fonts.sh` を作成し、fonttools（pyftsubset）を使って Regular と Bold の 2 ウェイトを生成する
  - サブセット対象文字にひらがな・カタカナ・常用漢字（2,136 字）・ASCII（U+0020–U+007E）を含める
  - `--no-subset-tables+=name` を使わず、フォントの name テーブル（著作権メタデータ）を保持したまま出力する
  - 生成先を `public/fonts/NotoSansJP-Regular.otf` と `public/fonts/NotoSansJP-Bold.otf` とする
  - _Requirements: 6.8, 5.10_

- [ ] 3.2 サブセットフォントと OFL ライセンスドキュメントをリポジトリに配置する
  - スクリプトを実行して生成済みサブセットフォントファイルを `public/fonts/` にコミットする
  - SIL OFL 1.1 の本文を `public/fonts/OFL.txt` として配置する
  - `NOTICE` ファイルを作成し「Noto Sans JP © Google LLC and the Noto Authors, SIL OFL 1.1」の帰属表示を記載する
  - _Requirements: 5.8, 5.9, 6.7_

- [ ] 4. (P) フォントローダーの実装
  - モジュールスコープの変数でフォント読み込み結果をキャッシュし、ウォームリクエスト時の再フェッチを回避する
  - FONT_URL_REGULAR と FONT_URL_BOLD を `Promise.all` で並列フェッチする
  - `AbortSignal.timeout(fontFetchTimeoutMs)` を各フェッチに設定してタイムアウトを制御する
  - フェッチ失敗・タイムアウト時はコンソール警告を出力し、空のフォントリストで処理を続行する
  - タスク 2.1 が完了していること（AppConfig の型定義が必要）
  - _Requirements: 3.6, 4.4, 4.5, 6.2_

- [ ] 5. (P) OGPテンプレートの実装
  - ファイル先頭にデザイントークン定数ブロック（BACKGROUND_COLOR、TEXT_COLOR、ACCENT_COLOR、TITLE_FONT_SIZE、LABEL_FONT_SIZE、PADDING）を定義し、日本語コメントで各項目の役割を説明する
  - SITE_NAME をブログ名として固定要素に描画し、title を可変要素として描画する JSX を実装する
  - textWidth でテキスト折り返しを制御し、3 行を超えた場合に末尾を「…」で省略する
  - Flexbox レイアウトで実装し、satori 非対応の CSS（calc()・z-index・WOFF2）を使用しない
  - JSX 本体ではデザイントークン定数のみを参照し、カラーコードや数値リテラルを直接埋め込まない
  - タスク 2.1 と 2.2 が完了していること（AppConfig・OgParams の型定義が必要）
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. 画像レンダラーの実装
- [ ] 6.1 SVG レンダリングパイプラインを実装する
  - satori を直接呼び出して JSX から SVG 文字列を生成する機能を実装する
  - フォントデータ配列と画像サイズを satori のオプションとして渡す
  - _Requirements: 1.2, 4.3_

- [ ] 6.2 PNG レンダリングパイプラインを実装する
  - next/og の ImageResponse を使って JSX から PNG Response を生成する機能を実装する
  - ImageResponse が返す Response を再構築して Cache-Control ヘッダーを上書きできるようにする
  - _Requirements: 1.2, 1.3, 4.2, 4.3_

- [ ] 7. APIエンドポイントの実装
  - `export const runtime = 'edge'` を宣言した GET ルートハンドラを実装する
  - パラメータ解析でエラーが返った場合はただちに 400 JSON レスポンスを返す
  - フォント読み込み・テンプレート生成・画像レンダリングの順に処理し、`Cache-Control: public, max-age=604800, stale-while-revalidate=86400` ヘッダーを付与して返す
  - レンダリング例外をすべて catch して 500 プレーンテキストレスポンスを返す
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3_

- [ ] 8. ユニットテストの実装
- [ ] 8.1 パラメータバリデーションのユニットテストを実装する
  - title 200 文字制限・非正整数の寸法・不正なフォーマット値の各エラーパスを検証する
  - title 省略時に空文字となること、未定義パラメータが無視されることを確認する
  - _Requirements: 7.1, 7.2_

- [ ] 8.2 設定ローダーのユニットテストを実装する
  - 有効な環境変数が正しく読み込まれることを確認する
  - 不正な数値型環境変数でデフォルト値へフォールバックし、コンソール警告が出ることを確認する
  - _Requirements: 7.1, 7.2_

- [ ]* 8.3 テンプレートレンダラーのスナップショットテストを実装する
  - 同一入力に対して常に同一の JSX 構造が返されることをスナップショットで確認する
  - _Requirements: 7.2_

- [ ] 9. リポジトリ公開ファイルの整備
- [ ] 9.1 (P) README.md を作成する
  - プロジェクト概要・クイックスタート・デプロイ手順・環境変数一覧を記述する
  - サポートするクエリパラメータの一覧とデフォルト値をテーブル形式でまとめる
  - フォークして別ブログ向けに適用するための手順（環境変数変更・テンプレートカスタマイズ）を記述する
  - Noto Sans JP の帰属表示（OFL 1.1）を記載する
  - _Requirements: 5.1, 5.2, 5.9, 6.6_

- [ ] 9.2 (P) 設定・ライセンスファイル群を作成する
  - `.gitignore` に `node_modules/`, `.next/`, `dist/`, `out/`, `.env*.local`, `.vercel/` を除外設定する
  - `.env.example` に全環境変数のプレースホルダーと説明を記載する（実値を含めない）
  - `.vercelignore` にテストファイル・スクリプトディレクトリ等を除外設定する
  - `LICENSE` ファイルに MIT ライセンス本文（著作権者: yu9824）を記載する
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 10. (P) GitHub Actions CI パイプラインを設定する
  - プルリクエストと main ブランチへのプッシュをトリガーにするワークフローファイルを作成する
  - Node.js 24.x 上でユニットテスト（`npm test`）・型チェック（`tsc --noEmit`）・`npm audit --audit-level=high` を実行する
  - いずれかのステップが失敗した場合に PR のステータスチェックを failing にする
  - _Requirements: 7.3, 7.4, 7.6, 7.7, 7.9_

- [ ] 11. (P) Dependabot を設定する
  - `.github/dependabot.yml` を作成し、npm 依存関係の週次自動更新 PR を有効にする
  - _Requirements: 7.8, 7.9_
