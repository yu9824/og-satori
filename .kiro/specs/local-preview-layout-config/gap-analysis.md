# ギャップ分析: local-preview-layout-config

> 作成日: 2026-04-09

---

## 1. 既存コードベースの現状

### モジュール構成

| ファイル | 責務 | 状態 |
|--------|------|------|
| `lib/config.ts` | 環境変数から `AppConfig` を生成 | 存在・安定 |
| `lib/params.ts` | URL クエリパラメータを解析・バリデーション | 存在・安定 |
| `lib/template.tsx` | JSX → satori 用 ReactElement | 存在・一部修正必要 |
| `lib/renderer.ts` | JSX → SVG / PNG | 存在・安定 |
| `lib/font.ts` | フォント読み込み・キャッシュ | 存在・安定 |
| `app/api/og/route.ts` | GET /api/og エンドポイント | 存在・安定 |
| `app/layout.tsx` | ルートレイアウト（最小構成）| 存在・安定 |
| `app/preview/` | プレビューページ | **存在しない** |

### アーキテクチャパターン

- `lib/` に純粋関数モジュール、`app/` にルートハンドラを配置するレイヤード構成
- 結果型は `{ ok: true; data: T } | { ok: false; error: E }` ディスクリミネーテッドユニオン
- モジュールスコープキャッシュ変数でウォームリクエスト最適化
- フロントエンドページは現状ゼロ（App Router のルートレイアウトのみ）
- Next.js 16 App Router、React 19、TypeScript strict モード

---

## 2. 要件ごとのギャップ分析

### 要件 1: ローカルプレビューページ

| 受け入れ基準 | 現状 | ギャップ |
|------------|------|---------|
| `/preview` ルートにブラウザアクセス可能なページ | なし | **Missing**: `app/preview/page.tsx` の新規作成が必要 |
| デフォルト設定で `/api/og` が生成した OGP 画像を表示 | `/api/og` は全パラメータをサポート済み | 画像 embed 表示ロジックが必要 |
| URL クエリパラメータ（title, width, height, textWidth, format）を受け付ける | なし | **Missing**: クエリパラメータの受け渡しロジック |
| `NODE_ENV=production` 時は 404 を返す | なし | **Missing**: production ガード |

### 要件 2: 設定パラメータのインタラクティブ変更

| 受け入れ基準 | 現状 | ギャップ |
|------------|------|---------|
| UI コントロール（title, width, height, textWidth, siteName, defaultTextWidthRatio）| なし | **Missing**: Client Component 全体 |
| コントロール変更時にフルリロードなしで OGP 画像を再レンダリング | なし | **Missing**: クライアントサイド状態管理（`useState`）と `<img src>` 動的更新 |
| 初期値を `.env.local` / `config.ts` デフォルトから取得 | `loadConfig()` は Server 側のみで動作 | **Constraint**: Server Component → Client Component への初期値受け渡しパターンが必要 |
| 無効値（非正の整数 `width` 等）のバリデーションエラー表示 | `lib/params.ts` にバリデーションロジックは存在 | **Missing**: フロントエンド側のバリデーション表示コンポーネント |
| 変更値をディスク・環境変数に永続化しない | 実装依存 | エフェメラル状態管理（`useState`）で対応可能 |

### 要件 3: textWidth に基づく水平中央寄せレイアウト

| 受け入れ基準 | 現状（`lib/template.tsx`） | ギャップ |
|------------|------|---------|
| タイトルコンテナの左右マージン = `(width − textWidth) / 2` | タイトルコンテナは `width: textWidth` のみ（左寄せ） | **Missing**: `marginLeft: (width - textWidth) / 2` の適用 |
| `textWidth === width` のとき水平マージン 0 | 式が未適用 | 式導入で自然に解決 |
| `textWidth > width` のとき `textWidth = width` にクランプ | クランプなし | **Missing**: `Math.min(textWidth, width)` によるクランプ |
| 固定左オフセットを title コンテナに適用しない | 現状は固定オフセットなし（`padding` のみ） | 中央寄せ式に統一すれば OK |

### 要件 4: ブログ名とタイトルの左端揃え

| 受け入れ基準 | 現状（`lib/template.tsx`） | ギャップ |
|------------|------|---------|
| フッター（アクセントライン + `siteName`）の左端をタイトルコンテナ左端に揃える | フッターはコンテナ左端（`padding` 内）固定 | **Missing**: フッターに同じ `(width − textWidth) / 2` オフセットを適用 |
| `textWidth < width` の場合に同一オフセット適用 | オフセットなし | **Missing**: `marginLeft` の追加 |
| `textWidth === width` の場合は追加オフセット 0 | 式未適用 | 式導入で自然に解決 |
| フッターの独立した固定マージンを排除 | 現状は独立固定マージンなし（`padding` のみ） | 中央寄せ式に統一すれば OK |

### 要件 5: フォントサイズ / 解像度スケーリング

| 受け入れ基準 | 現状 | ギャップ |
|------------|------|---------|
| `titleFontSize`, `labelFontSize` を `min(width, height) / BASE_SHORT_SIDE` で比例スケーリング | `_calcScaleFactor` + `_scaleTokens` で実装済み ✅ | なし |
| プレビュー UI で width/height 変更時に即座反映 | プレビュー UI なし | 要件1・2のプレビュー実装で解決 |
| `TITLE_FONT_SIZE`, `LABEL_FONT_SIZE` をファイル先頭の定数として管理 | `lib/template.tsx` L50-54 に定義済み ✅ | なし |

---

## 3. 実装アプローチ選択肢

### Option A: 純粋 Server Component + URL フォームサブミット
- プレビューページを RSC として実装し、パラメータ変更は URL クエリの書き換えで対応
- **問題**: 要件 2.2「フルリロードなしに再レンダリング」を満たさない

### Option B: Server Component（初期値配信）+ Client Component（インタラクティブ制御）【推奨】

```
app/preview/
  page.tsx           ← Server Component: loadConfig() → 初期値を Client に props 渡し
  PreviewClient.tsx  ← Client Component: useState + img src 動的更新
```

- `page.tsx`（Server Component）で `loadConfig()` を呼び出し、初期値を取得
- `PreviewClient.tsx`（Client Component）で `useState` でコントロール値を管理
- コントロール変更時に `/api/og?title=...&width=...` の URL を組み立てて `<img src>` を更新
- バリデーションはクライアント側で実施（`lib/params.ts` のロジックを再利用 or 独自実装）
- **利点**: 要件すべてを満たす / Next.js App Router のパターンに準拠 / Server・Client 責務が明確
- **懸念**: `lib/params.ts` のバリデーションをクライアント側でも使うには `"use client"` 制約を回避する設計が必要（`parseParams` は純粋関数のため Client でインポート可能）

### Option C: Server Actions によるインタラクティブ更新
- パラメータ変更のたびにサーバーアクションを経由して処理
- **問題**: エフェメラルな表示変更にサーバーラウンドトリップは不要・過剰

---

## 4. 推奨アプローチと主要設計ポイント

**Option B（ハイブリッド）を推奨。**

### 実装スコープ

#### 新規ファイル
| ファイル | 種別 | 内容 |
|--------|------|------|
| `app/preview/page.tsx` | Server Component | production ガード + loadConfig() → PreviewClient へ props 渡し |
| `app/preview/PreviewClient.tsx` | Client Component | useState + コントロール UI + img src 動的更新 |

#### 変更ファイル
| ファイル | 変更内容 |
|--------|--------|
| `lib/template.tsx` | タイトルコンテナ・フッターに `(width − textWidth) / 2` の `marginLeft` を追加、`textWidth` クランプ処理を追加 |

### 技術的な考慮点

1. **`loadConfig()` のサーバー専用性**: `process.env` 依存のため Client Component では直接呼べない。Server Component の `page.tsx` で呼び出し、`initialConfig` として props 経由で渡す。
2. **`parseParams` のクライアント利用**: 純粋関数のため Client Component からも `import` 可能。バリデーション再実装は不要。
3. **satori の `calc()` 非対応**: `(width - textWidth) / 2` は JSX に渡す前に JS で計算し、数値として `marginLeft` に設定する必要がある。
4. **production ガード**: `app/preview/page.tsx` の先頭で `if (process.env.NODE_ENV === "production") notFound()` を呼び出す（Next.js の `notFound()` 関数を使用）。
5. **`siteName` と `defaultTextWidthRatio` のコントロール**: これらは `AppConfig` フィールドのため、初期値は Server Component 経由で取得、UI 変更はクライアント側でエフェメラルに管理する。

---

## 5. 工数・リスク評価

| 観点 | 評価 | 根拠 |
|-----|------|------|
| 工数 | **S（1〜3 日）** | 新規ファイル 2 つ + 既存 1 ファイルの局所修正。新しい外部依存なし。パターンは App Router の標準的な Server/Client Component 分割 |
| リスク | **Low** | フォントサイズスケーリング・パラメータパース等のコアロジックは実装済み。テンプレート修正は `marginLeft` 追加の局所変更のみ |

---

## 6. デザインフェーズへの持ち越し事項

| 項目 | 内容 |
|-----|------|
| バリデーション実装の方針 | `lib/params.ts` の `parseParams` をクライアント側で再利用するか、プレビュー専用の簡易バリデーションを実装するか |
| `PreviewClient.tsx` のコントロール UI | スライダー vs 数値 input フィールドのどちらを採用するか（要件は「input fields or sliders」どちらでも可） |
| `siteName` コントロールの反映方法 | `siteName` は `/api/og` のクエリパラメータに含まれないため、プレビュー時の反映方法（クライアント内でテンプレートを直接呼ぶ or サーバーサイドパラメータ化）を設計で決定する必要がある |
