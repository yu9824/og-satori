/**
 * ConfigLoader: 環境変数を読み取り、フォールバック付きの AppConfig を返すモジュール
 *
 * フォークして別のブログに適用する場合は、環境変数を変更するだけで設定を上書きできます。
 * 詳細は README.md の「環境変数一覧」セクションを参照してください。
 */

/** アプリケーション全体の設定 */
export interface AppConfig {
  /** ブログ名。OGP テンプレートの固定要素として表示される。env: SITE_NAME */
  siteName: string;
  /** ベース URL。フォント URL の絶対 URL 化に使用する。env: NEXT_PUBLIC_BASE_URL → VERCEL_URL → 'http://localhost:3000' の順でフォールバック */
  baseUrl: string;
  /** Regular ウェイトフォントの URL。env: FONT_URL_REGULAR */
  fontUrlRegular: string;
  /** Bold ウェイトフォントの URL。env: FONT_URL_BOLD */
  fontUrlBold: string;
  /** フォントフェッチのタイムアウト（ミリ秒）。env: FONT_FETCH_TIMEOUT_MS */
  fontFetchTimeoutMs: number;
  /** デフォルト画像幅（px）。env: DEFAULT_WIDTH */
  defaultWidth: number;
  /** デフォルト画像高さ（px）。env: DEFAULT_HEIGHT */
  defaultHeight: number;
  /** デフォルトテキスト幅の比率（0〜1）。env: DEFAULT_TEXT_WIDTH_RATIO */
  defaultTextWidthRatio: number;
}

/**
 * 数値型の環境変数を解析するヘルパー関数
 * 不正な値の場合はコンソール警告を出力してデフォルト値を返す
 *
 * @param value - 環境変数の文字列値（undefined の場合あり）
 * @param defaultValue - フォールバック値
 * @param varName - 警告メッセージに表示する変数名
 * @returns 解析された数値またはデフォルト値
 */
function parseNumberEnv(
  value: string | undefined,
  defaultValue: number,
  varName: string
): number {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    // 不正な値の場合はログ警告を出力してデフォルト値を使用する
    console.warn(
      `[ConfigLoader] 環境変数 ${varName} の値 "${value}" は有効な数値ではありません。デフォルト値 ${defaultValue} を使用します。`
    );
    return defaultValue;
  }
  return parsed;
}

/**
 * ベース URL を環境変数から解決するヘルパー関数
 * NEXT_PUBLIC_BASE_URL → VERCEL_URL → 'http://localhost:3000' の順でフォールバック
 */
function resolveBaseUrl(): string {
  // NEXT_PUBLIC_BASE_URL が設定されていればそのまま使用する
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // VERCEL_URL は https:// プレフィックスを持たないため付与する
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // ローカル開発環境のデフォルト
  return "http://localhost:3000";
}

/**
 * 環境変数を読み取り AppConfig を返す
 * 不正な値はログ警告を出してデフォルト値を使用する
 */
export function loadConfig(): AppConfig {
  const baseUrl = resolveBaseUrl();

  return {
    // ブログ名: デフォルトは "yu9824's Notes"
    siteName: process.env.SITE_NAME ?? "yu9824's Notes",
    baseUrl,
    // フォント URL: 未指定の場合は public/fonts/ の同梱サブセットを使用する
    fontUrlRegular:
      process.env.FONT_URL_REGULAR ??
      `${baseUrl}/fonts/NotoSansJP-Regular.otf`,
    fontUrlBold:
      process.env.FONT_URL_BOLD ?? `${baseUrl}/fonts/NotoSansJP-Bold.otf`,
    // フォントフェッチのタイムアウト: デフォルト 5000ms
    fontFetchTimeoutMs: parseNumberEnv(
      process.env.FONT_FETCH_TIMEOUT_MS,
      5000,
      "FONT_FETCH_TIMEOUT_MS"
    ),
    // 画像デフォルト寸法: 1200×630px（OGP 標準サイズ）
    defaultWidth: parseNumberEnv(
      process.env.DEFAULT_WIDTH,
      1200,
      "DEFAULT_WIDTH"
    ),
    defaultHeight: parseNumberEnv(
      process.env.DEFAULT_HEIGHT,
      630,
      "DEFAULT_HEIGHT"
    ),
    // テキスト幅の比率: デフォルトは画像幅の 80%
    defaultTextWidthRatio: parseNumberEnv(
      process.env.DEFAULT_TEXT_WIDTH_RATIO,
      0.8,
      "DEFAULT_TEXT_WIDTH_RATIO"
    ),
  };
}
