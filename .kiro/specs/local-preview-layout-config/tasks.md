# 実装計画

## タスク一覧

- [x] 1. OGP テンプレートのレイアウト修正と機能拡張
- [x] 1.1 タイトルの水平中央寄せとフッター左端揃えの実装
  - `effectiveTextWidth = min(textWidth, width)` で `textWidth > width` 時のオーバーフローをクランプする
  - `innerMarginLeft = (width - effectiveTextWidth) / 2` でタイトルコンテナの左右マージンを均等にする（`textWidth === width` 時はマージン 0）
  - フッター（アクセントライン + siteName）に同一の `innerMarginLeft` を適用し、タイトルコンテナの左端と揃える
  - 既存の固定左オフセットを削除し `innerMarginLeft` による一元管理に統一する
  - `lib/template.tsx` のモジュール先頭 JSDoc コメントを更新し、レイアウト計算ロジックの意図を日本語で記述する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 1.2 BASE_SHORT_SIDE 定数化とスケーリング引数対応
  - `BASE_SHORT_SIDE` をファイル先頭の明示的な名前付き定数として定義し、フォーク時のカスタマイズポイントであることを JSDoc コメントで明示する
  - `TITLE_FONT_SIZE`, `LABEL_FONT_SIZE` も同様にファイル先頭定数として整理し、JSDoc でカスタマイズ方法を案内する
  - `RenderInput` に optional `baseShortSide` フィールドを追加し、指定時はファイル先頭定数をオーバーライドしてスケーリング計算に使用する
  - 未指定時は既存の `BASE_SHORT_SIDE` 定数にフォールバックし、後方互換を維持する
  - _Requirements: 5.1, 5.3_

- [x] 1.3 色オーバーライド対応の追加
  - `ColorOverrides` 型（`backgroundColor?`, `textColor?`, `accentColor?`）を定義し、JSDoc で用途と値フォーマット（CSS hex）を記述する
  - `RenderInput` に optional `colorOverrides` フィールドを追加する
  - `renderTemplate` 内で各色定数を `colorOverrides?.xxx ?? DEFAULT_COLOR` の形でフォールバック参照に置き換える
  - 既存 `/api/og` の呼び出しコードは変更不要であることを確認し、型チェック（`npm run type-check`）でエラーがないことを確認する
  - _Requirements: 2.1_

- [x] 2. (P) プレビュー専用 API エンドポイントの実装
  - `app/api/preview-og/route.ts` を新規作成し、モジュール先頭に日本語 JSDoc コメント（production 限定 404 の理由と各パラメータの役割）を記述する
  - `NODE_ENV === "production"` の場合に `notFound()` で 404 を返す production ガードを実装する
  - `siteName`, `backgroundColor`, `textColor`, `accentColor`, `baseShortSide` を optional クエリパラメータとして受け付け、`siteName` は `config.siteName` を上書きして渡す
  - 色パラメータを `ColorOverrides` として、`baseShortSide` を `RenderInput.baseShortSide` として `renderTemplate` に渡す
  - それ以外の処理（`parseParams`, `loadFont`, `render`）は既存 `/api/og` と同じパターンで実装する
  - _Requirements: 1.4, 2.1_

- [x] 3. (P) `/preview` ページの実装
- [x] 3.1 PreviewPage Server Component の実装
  - `app/preview/page.tsx` を新規作成し、モジュール先頭に日本語 JSDoc コメントを記述する
  - `loadConfig()` を呼び出して初期設定値（width, height, defaultTextWidthRatio, siteName）を取得し、`textWidth` の初期値を `floor(width * defaultTextWidthRatio)` で算出する
  - URL `searchParams` からの `title`, `width`, `height`, `textWidth` の初期値オーバーライドを受け付け、型変換のみ行ってバリデーションは `PreviewClient` に委ねる
  - production ガードは持たず、本番環境でも動作することをコメントで明記する
  - 取得した初期値を `PreviewClient` に `initialConfig` props として渡す
  - _Requirements: 1.1, 1.3, 2.3_

- [x] 3.2 PreviewClient Client Component の実装
  - `app/preview/PreviewClient.tsx` を新規作成し、`"use client"` ディレクティブを先頭に記述する
  - `title`, `width`, `height`, `textWidth`, `defaultTextWidthRatio` の入力コントロール（input フィールド / スライダー）を提供する
  - コントロール変更のたびに `parseParams` でバリデーションを実行し、エラー時はエラーメッセージを表示して `<img src>` を更新しない（旧画像を維持する）
  - `defaultTextWidthRatio` または `width` が変更された場合、`textWidth` を `floor(width * defaultTextWidthRatio)` で自動再計算する
  - バリデーション通過後に `/api/og?title=...&width=...&height=...&textWidth=...` URL を構築して `<img src>` に設定し、フルページリロードなしで再レンダリングする
  - OGP 画像クリックで現在の `/api/og?...` URL を `navigator.clipboard.writeText` でコピーし、ボタン/ラベル変化でフィードバックを提供する
  - すべての状態は `useState` でエフェメラルに管理し、ディスク・env への永続化は行わない
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 5.2_

- [x] 4. `/preview/config` ページの実装
- [x] 4.1 ConfigPreviewPage Server Component の実装
  - `app/preview/config/page.tsx` を新規作成し、モジュール先頭に日本語 JSDoc コメント（production 404 の理由を記述）を記述する
  - `NODE_ENV === "production"` の場合に `notFound()` で 404 を返すガードを先頭で実装する
  - `loadConfig()` を呼び出して初期設定値（siteName, width, height, defaultTextWidthRatio, 色定数）を取得する
  - 取得した初期値を `ConfigPreviewClient` に `initialConfig` props として渡す
  - _Requirements: 1.4, 2.3_

- [x] 4.2 ConfigPreviewClient Client Component の実装
  - `app/preview/config/ConfigPreviewClient.tsx` を新規作成し、`"use client"` ディレクティブを先頭に記述する
  - `siteName`, `defaultTextWidthRatio`, `backgroundColor`, `textColor`, `accentColor`, `baseShortSide` の編集コントロールを提供する
  - `title`, `width`, `height` は読み取り専用 input として表示し、変更は `/preview` ページで行う旨を UI に明示する
  - コントロール変更のたびにバリデーション（空の siteName 不可、色は `/^#[0-9a-fA-F]{3,8}$/`、`baseShortSide` は正整数）を実行し、エラー時はエラーメッセージを表示して `<img src>` を更新しない
  - バリデーション通過後に `/api/preview-og?...` URL を構築して `<img src>` に設定する
  - 「スニペットをコピー」ボタンで `buildConfigSnippet(state)` を実行し、`lib/config.ts` / `lib/template.tsx` への変更スクリプトをクリップボードに書き込んでフィードバックを表示する
  - すべての状態は `useState` でエフェメラルに管理する（永続化なし）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.4_

- [x] 5. テスト実装
- [x] 5.1 (P) OGP テンプレートレイアウト計算のユニットテスト
  - `innerMarginLeft` 計算の正確性を検証する（左右均等マージン、`textWidth === width` 時のマージン 0、`textWidth > width` 時のクランプ動作）
  - フッターオフセットがタイトルと同一値に設定されることを確認する
  - `baseShortSide` オーバーライドによってスケーリング係数が変化することを確認する
  - 色オーバーライドが未指定時にデフォルト定数にフォールバックすることを確認する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1_

- [ ]* 5.2 (P) プレビュー API エンドポイントのルートテスト
  - `NODE_ENV === "production"` 設定下で `/api/preview-og` が 404 を返すことを確認する
  - 各オーバーライドパラメータ（`siteName`, 色, `baseShortSide`）が `renderTemplate` に正しく渡されることを確認する
  - _Requirements: 1.4, 2.1_
