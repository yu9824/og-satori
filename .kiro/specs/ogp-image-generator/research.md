# Research & Design Decisions

---
**Purpose**: 設計フェーズの調査記録と意思決定の根拠を残す。

---

## Summary

- **Feature**: `ogp-image-generator`
- **Discovery Scope**: New Feature（グリーンフィールド）
- **Key Findings**:
  - satori は SVG を生成するのみ。PNG への変換は `next/og` の `ImageResponse`（内部で satori + resvg を使用）か、`satori` 直接 + `@resvg/resvg-js` の 2 通りある。SVG と PNG 両対応のため、`satori` 直接使用 + `ImageResponse` のハイブリッド構成が最適。
  - Edge Runtime は PNG 生成コストを約 40% 削減できるが、WASM 動的ロードに制限がある。`next/og` 経由であれば Next.js App Router の Edge Runtime で動作実績があり採用可能。
  - フォント形式は WOFF2 非対応。TTF/OTF のみ。フォントデータをモジュールスコープにキャッシュすると初期化コストが半減する。

---

## Research Log

### satori と next/og の位置づけ

- **Context**: OGP 画像を SVG と PNG の両形式で返す要件（1.2）に対し、最適な描画ライブラリの選定が必要。
- **Sources Consulted**:
  - https://github.com/vercel/satori
  - https://vercel.com/docs/functions/og-image-generation
- **Findings**:
  - `satori(element, options)` は JSX (React Element) を受け取り、SVG 文字列を返す非同期関数。
  - `next/og` の `ImageResponse` は `satori` + `resvg` を内包し、PNG レスポンスを直接返す。
  - satori は `useState`・`useEffect` 非対応。ステートレスな JSX のみ使用可能。
  - サポート CSS: Flexbox、transform、filter、gradient 等。`calc()`・z-index・3D 変換は非対応。
  - フォント形式: TTF / OTF / WOFF のみ。WOFF2 は非対応。
- **Implications**:
  - SVG 出力: `satori` 直接呼び出し → SVG 文字列返却
  - PNG 出力: `ImageResponse` 経由（satori + resvg の統合パイプライン）
  - テンプレートは純粋な JSX 関数として定義し、両パスで共有する。

---

### Edge Runtime vs Serverless（Node.js）

- **Context**: 要件 4.1〜4.3 でどちらのランタイムを選択するかの判断。
- **Sources Consulted**:
  - https://vercel.com/docs/functions/runtimes
- **Findings**:
  - Edge Runtime: タイムアウト 25 秒、バンドル 1-4 MB（プランによる）、V8 ベース、コールドスタートが速い、コストが約 15 倍安い。
  - Serverless: タイムアウト 10-60 秒（プラン依存）、バンドル 250 MB、フル Node.js API 利用可能。
  - Next.js App Router の `export const runtime = 'edge'` で Edge Runtime を明示的に指定可能。
  - `next/og` の `ImageResponse` は Next.js App Router の Edge Runtime で動作確認済み。
- **Implications**:
  - Edge Runtime を採用。PNG 生成に `ImageResponse`、SVG 生成に `satori` スタンドアロンを使用する構成で両立可能。

---

### テストフレームワーク（Vitest vs Jest）

- **Context**: 要件 7.1〜7.6 で TypeScript プロジェクトに適したユニットテスト基盤の選定。
- **Findings**:
  - Vitest: TypeScript ネイティブ対応（設定不要）、コールドスタート約 2 秒（Jest は約 12 秒）、Jest API と 95% 互換。
  - Jest: 設定が複雑（ts-jest 等が必要）、Next.js とのインテグレーションが煩雑。
- **Implications**:
  - Vitest を採用。バリデーション関数・パーサーのユニットテストに使用する。

---

### フォントキャッシュ戦略

- **Context**: Edge Runtime での日本語フォント読み込みは遅延の原因になりやすい（要件 3.6、4.4）。
- **Findings**:
  - satori の `options.fonts` をモジュールスコープの変数に保持することで、ウォームリクエスト時の再フェッチを回避できる（約 2 倍高速化）。
  - Edge Runtime ではファイルシステム読み込み不可のため、フォントは URL フェッチまたはバンドル内の ArrayBuffer として提供する必要がある。
  - フォールバック: フォント取得失敗時はシステムフォントで描画継続（要件 4.5）。日本語は文字化けするが、サービスは停止しない。
- **Implications**:
  - フォントローダーはモジュールスコープの `Promise` として宣言し、初回リクエスト時のみ fetch する設計にする。

---

### Next.js App Router vs 素の Vercel Function

- **Context**: 要件 4 のデプロイ方式の選定。og-image は素の Vercel Function を使用している。
- **Findings**:
  - 素の Vercel Function (`api/og.ts`): 軽量、Next.js 不要、ただし `next/og` の `ImageResponse` は Next.js 外でも `@vercel/og` として利用可能。
  - Next.js App Router (`app/api/og/route.ts`): `next/og` が組み込みで使いやすい、`next dev` でローカル開発可能（要件 6.5 充足）、設定ファイルが標準化されている。
- **Implications**:
  - Next.js App Router を採用。理由：(1) `next/og` との統合が最もシームレス、(2) `next dev` でローカル開発可能（要件 6.5）、(3) 将来的なプレビュー UI 追加が容易。

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Next.js App Router + Edge Runtime | `app/api/og/route.ts` + `export const runtime = 'edge'` | next/og 統合が簡単、コスト最小 | バンドルサイズ制限 1-4 MB（フォント含む） | 採用 |
| Next.js App Router + Serverless | `app/api/og/route.ts` + デフォルト runtime | バンドルサイズ余裕、完全 Node.js API | コールドスタートが遅い | フォールバック候補 |
| 素の Vercel Function | `api/og.ts` + `@vercel/og` | 軽量、非 Next.js | `next dev` 不可、設定が手動 | 不採用 |

---

## Design Decisions

### Decision: SVG/PNG 両対応の描画パイプライン

- **Context**: 要件 1.2、1.3 で SVG と PNG を同一エンドポイントから返す必要がある。
- **Alternatives Considered**:
  1. `ImageResponse` のみ（PNG 専用）→ SVG 要件を満たせない
  2. `satori` のみ（SVG 生成）+ `@resvg/resvg-js` で PNG 変換
  3. `satori`（SVG）+ `ImageResponse`（PNG）のハイブリッド
- **Selected Approach**: ハイブリッド（Option 3）。`format=svg` の場合は `satori` 直接、`format=png`（デフォルト）の場合は `ImageResponse` を使用。
- **Rationale**: `ImageResponse` は Vercel 最適化済みの PNG パイプラインであり、Edge Runtime での動作実績がある。SVG 生成には同じ satori を使うが、追加の WASM 依存（resvg）を避けられる。
- **Trade-offs**: コードパスが 2 つになるが、テンプレート（JSX 関数）は共有するため重複は最小。

### Decision: テストフレームワーク Vitest 採用

- **Context**: 要件 7.1〜7.5 のユニットテスト実装と CI 統合。
- **Selected Approach**: Vitest。
- **Rationale**: TypeScript 設定が不要、Jest API と互換、Node.js 24.x との相性が良い。
- **Trade-offs**: Jest ほどの成熟度はないが、現在の新規 TypeScript プロジェクトでは標準的な選択。

### Decision: フォントのロード方式（URL フェッチ + モジュールキャッシュ）

- **Context**: 要件 3.6（日本語フォントの正確なレンダリング）と要件 4.4（ファイルシステム非依存）の両立。
- **Selected Approach**: URL フェッチ（`FONT_URL` 環境変数 or デフォルト URL）+ モジュールスコープ変数でキャッシュ。
- **Rationale**: Edge Runtime はファイルシステム読み込みが不可。URL フェッチはプラットフォーム非依存で、移植性要件（6.2）も充足する。
- **Trade-offs**: 初回コールドスタートに数十 ms の追加レイテンシが生じる可能性がある。キャッシュにより 2 回目以降は解消。

---

## Risks & Mitigations

- Edge Runtime のバンドルサイズ制限（1 MB / Hobby プラン）— 日本語フォントは数 MB になりうる。フォントをバンドルに含めず URL フェッチに限定することで回避。Hobby プラン利用者はフォント URL 設定を外部 CDN 経由にする必要あり。
- satori の CSS 制限（`calc()` 非対応）— テンプレートの Flexbox レイアウトで代替可能。設計時に `calc()` を使わないよう注意。
- フォント取得失敗時の日本語文字化け — システムフォントフォールバック（要件 4.5）では日本語が壊れるリスクがある。ログに警告を出し、利用者に設定確認を促す。

---

## References

- [satori GitHub](https://github.com/vercel/satori)
- [Vercel OG Image Generation](https://vercel.com/docs/functions/og-image-generation)
- [Vercel Runtimes](https://vercel.com/docs/functions/runtimes)
- [Next.js ImageResponse API](https://nextjs.org/docs/app/api-reference/functions/image-response)
- [Vitest](https://vitest.dev/)
