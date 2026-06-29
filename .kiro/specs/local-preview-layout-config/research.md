# リサーチ & 設計判断ログ

---
**目的**: ディスカバリフェーズで得た知見、アーキテクチャ検討、設計判断の根拠を記録する。

---

## Summary

- **Feature**: `local-preview-layout-config`
- **Discovery Scope**: Extension（既存 Next.js App Router システムへの機能追加）
- **Key Findings**:
  - Server Component + Client Component の分割パターンが要件（フルリロードなし再レンダリング + サーバー側 `loadConfig()` 利用）を最も自然に満たす
  - `lib/params.ts` の `parseParams` は純粋関数のため、クライアントサイドでも再利用可能（バリデーション重複実装不要）
  - `siteName` は現状 `/api/og` のクエリパラメータに含まれないため、プレビュー用に optional override を追加する必要がある

---

## Research Log

### `/api/og` の `siteName` オーバーライド方法

- **Context**: 要件 2.1 は `siteName` コントロールを必須としているが、現在 `siteName` は `loadConfig()` 経由で環境変数から取得されており、クエリパラメータ経由の変更手段が存在しない。
- **Sources Consulted**: `lib/config.ts`, `app/api/og/route.ts`, `lib/params.ts` のコードリーディング
- **Findings**:
  - `OgParams`（`lib/params.ts`）は画像生成パラメータのみを管理する設計
  - `AppConfig`（`lib/config.ts`）は環境変数から読み込む設定管理
  - `siteName` はレンダリング引数（`config.siteName`）として `renderTemplate` に渡される
- **Implications**: `siteName` を `OgParams` に追加するより、`route.ts` 内で optional クエリパラメータとして受け取り `config.siteName` を上書きする方が責務分離を保てる。`lib/params.ts` への変更は最小化。

### `parseParams` のクライアントサイド利用可否

- **Context**: プレビュー UI でバリデーション即時フィードバックが必要（要件 2.4）。`lib/params.ts` を再利用できれば重複実装を避けられる。
- **Sources Consulted**: `lib/params.ts` コードリーディング
- **Findings**:
  - `parseParams` は `URLSearchParams` と `ParamDefaults` のみを受け取る純粋関数
  - `process.env` / Node.js API に依存していない
  - `"use client"` コンポーネントから `import` 可能
- **Implications**: Client Component で `parseParams` をそのままインポートして使用できる。バリデーション再実装不要。

### satori の `calc()` 非対応と中央寄せ計算

- **Context**: 要件 3.1 は `(width - textWidth) / 2` の余白を要求するが、satori は `calc()` 非対応。
- **Sources Consulted**: `lib/template.tsx` コードリーディング、satori 制約（`tech.md`）
- **Findings**:
  - satori は Flexbox のみ対応、`calc()` 非対応
  - 現状テンプレートは `padding: tokens.padding` を外枠に設定
  - `marginLeft` は JSX に渡す前に JavaScript で計算した数値で設定する必要がある
- **Implications**: 中央寄せオフセットは `renderTemplate` 呼び出し前に計算する。具体的には `innerMarginLeft = Math.max(0, Math.floor((width - effectiveTextWidth) / 2) - tokens.padding)` をタイトルコンテナとフッターコンテナの `marginLeft` に設定する。

### production ガードの実装方法

- **Context**: 要件 1.4 は `NODE_ENV=production` 時に 404 を返すことを要求する。
- **Sources Consulted**: Next.js App Router ドキュメント（`notFound()` 関数）
- **Findings**:
  - Next.js App Router の `notFound()` 関数は Server Component 内で呼び出せる
  - `import { notFound } from "next/navigation"` で利用可能
  - `process.env.NODE_ENV` はビルド時に静的解決される
- **Implications**: `app/preview/page.tsx` の冒頭で `if (process.env.NODE_ENV === "production") notFound()` を実行すれば要件を満たせる。

### `defaultTextWidthRatio` コントロールの役割

- **Context**: 要件 2.1 は `defaultTextWidthRatio` コントロールを必須としているが、`textWidth` が既に独立したコントロールとして存在する。
- **Findings**:
  - `defaultTextWidthRatio` は `textWidth` の派生元であり、`textWidth = floor(width * defaultTextWidthRatio)` で計算される
  - プレビュー UI では `defaultTextWidthRatio` 変更時に `textWidth` を再計算するという連動設計が自然
  - `width` 変更時も同様に `textWidth` を再計算する
- **Implications**: `defaultTextWidthRatio` を変更すると `textWidth` が自動更新される。`textWidth` は独立して手動入力でも変更可能。

### `.env.local` 非使用とコピースニペットのターゲット

- **Context**: `/preview/config` の「スニペットコピー」機能で生成するテキストの出力先として `.env.local` が候補にあった。
- **Sources Consulted**: ユーザーフィードバック
- **Findings**:
  - `.env.local` は git 管理外のため、コピーした内容をリポジトリに残せない
  - `lib/config.ts` の `??` フォールバック値と `lib/template.tsx` の定数はどちらも git 管理対象
  - 再現性確保のためには git 管理ファイルへの変更が適切
- **Implications**: スニペットは `.env.local` 形式でなく、`lib/config.ts` のデフォルト値変更箇所と `lib/template.tsx` の定数変更箇所を示すテキスト形式で生成する。環境変数での上書きは引き続き可能だが、スニペットは利用しない。

### 2 ルート構成（`/preview` + `/preview/config`）の採用理由

- **Context**: 当初は 1 つの `/preview` ページに全コントロールを集約する設計だった。
- **Sources Consulted**: ユーザーフィードバック（用途の違いを明確に分離したい）
- **Findings**:
  - 「本番 URL を確認する」ユースケースは production でも動作させたい
  - 「色・サイト名等、環境変数では変えられない値を試す」ユースケースはローカル限定でよい
  - 後者の `/preview/config` は production に公開しないため production ガードが必要
- **Implications**: `/preview`（production-safe）と `/preview/config`（dev 専用）に分割。それぞれ異なる API エンドポイント（`/api/og` vs `/api/preview-og`）を使用する。

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Option A: 純粋 Server Component + URL フォームサブミット | プレビューページを RSC として実装し、パラメータ変更は URL クエリ書き換えで対応 | シンプルな実装 | 要件 2.2「フルリロードなし」を満たさない | 不採用 |
| Option B: Server Component（初期値）+ Client Component（インタラクティブ制御）| `page.tsx` が `loadConfig()` で初期値取得、`PreviewClient.tsx` が `useState` + img src 動的更新 | 要件全て満たす / App Router パターンに準拠 / Server・Client 責務明確 | Server → Client への初期値受け渡しが必要 | **採用** |
| Option C: Server Actions によるインタラクティブ更新 | パラメータ変更ごとにサーバーアクション経由 | サーバーサイド処理の一元化 | エフェメラル表示変更にサーバーラウンドトリップは過剰 | 不採用 |

---

## Design Decisions

### Decision: `siteName` を `/api/og` の optional クエリパラメータとして追加

- **Context**: プレビュー UI からの `siteName` 変更を `/api/og` に反映する必要がある
- **Alternatives Considered**:
  1. `OgParams` に `siteName` を追加 → `lib/params.ts` の責務（画像生成パラメータ管理）に `siteName`（設定値）が混入する
  2. `route.ts` 内で直接処理 → `OgParams` の責務を汚染せずに済む
- **Selected Approach**: `route.ts` 内で `searchParams.get("siteName")` を読み取り、存在する場合は `config.siteName` を上書きする
- **Rationale**: `lib/params.ts` の責務境界を維持しつつ最小変更でプレビュー要件を満たせる
- **Trade-offs**: `siteName` のバリデーション（空文字チェック等）は `route.ts` 内に追加する必要がある
- **Follow-up**: production 環境でも `siteName` クエリパラメータが有効になることを確認（セキュリティリスクなし）

### Decision: プレビュー拡張パラメータを専用エンドポイントに分離

- **Context**: `siteName` に加え `backgroundColor`、`textColor`、`accentColor` の色オーバーライドをプレビューで変更可能にする要件が追加された。これらを本番 `/api/og` に追加すると第三者が任意パラメータを使用できる懸念がある。
- **Alternatives Considered**:
  1. `/api/og` に全パラメータを追加（`NODE_ENV=production` 時は無視）— 本番エンドポイントのパラメータセットが拡大し将来の管理コストが増加
  2. シークレットトークン方式 — URL に secret が露出し、ログや履歴から漏洩するリスクがある
  3. 専用プレビューエンドポイント `/api/preview-og` に production ガードを設置 — 本番エンドポイントを完全に無変更に保てる
- **Selected Approach**: 専用エンドポイント `app/api/preview-og/route.ts` を新設し、先頭で `NODE_ENV === "production"` を判定して `notFound()` を返す
- **Rationale**: 本番 `/api/og` が完全無変更のため既存の動作に影響なし。production デプロイ時にエンドポイントが 404 になるため外部公開リスクがない。最もシンプルで確実な分離策。
- **Trade-offs**: preview-og と og で一部同じロジックが重複する — 共通ロジックは `lib/` モジュールに集約済みのため、ルートハンドラの重複は最小限
- **Follow-up**: `/api/preview-og` の `NODE_ENV` ガードが正しく機能することをインテグレーションテストで確認する

### Decision: 中央寄せオフセット計算式

- **Context**: 要件 3.1 は `(width - textWidth) / 2` を指定するが、外枠の padding との関係を明確にする必要がある
- **Selected Approach**:
  - `effectiveTextWidth = Math.min(textWidth, width)`（要件 3.3 クランプ）
  - `centerOffset = Math.floor((width - effectiveTextWidth) / 2)`（全体幅基準）
  - `innerMarginLeft = Math.max(0, centerOffset - tokens.padding)`（padding 分を差し引いた内側オフセット）
  - タイトルコンテナとフッターコンテナ両方に同一の `innerMarginLeft` を適用
- **Rationale**: 外枠 padding を維持しつつ、`(width - textWidth) / 2` が画像全体の左端から計測される値として整合する
- **Trade-offs**: 小さな `textWidth` 値では `innerMarginLeft` が大きくなりフッターが狭く見える可能性がある

---

## Risks & Mitigations

- `siteName` / 色パラメータの長い文字列がレイアウトを崩す可能性 — プレビューは開発者向けのため、バリデーションは最小限（空文字のみ除外、色は CSS hex 形式のみ推奨）で対応
- `parseParams` を Client Component にインポートすると将来的に Node.js API への依存が追加された場合にビルドエラーになる — 現状は純粋関数のため問題なし、将来の変更時は注意が必要
- `innerMarginLeft` が 0 未満になるケース（`textWidth` が大きく `centerOffset < tokens.padding`）— `Math.max(0, ...)` で防止済み

---

## References

- satori CSS 制約: `tech.md` (steering)
- Next.js `notFound()`: https://nextjs.org/docs/app/api-reference/functions/not-found
- 既存パラメータバリデーション: `lib/params.ts`
- 既存設定読み込み: `lib/config.ts`
- 既存テンプレート: `lib/template.tsx`
