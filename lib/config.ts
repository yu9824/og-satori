/**
 * ConfigLoader: 環境変数を読み取り、フォールバック付きの AppConfig を返すモジュール
 */

/** アプリケーション全体の設定 */
export interface AppConfig {
  /** ブログ名。OGP テンプレートの固定要素として表示される。env: SITE_NAME */
  siteName: string;
  /** デフォルト画像幅（px）。env: DEFAULT_WIDTH */
  defaultWidth: number;
  /** デフォルト画像高さ（px）。env: DEFAULT_HEIGHT */
  defaultHeight: number;
  /** デフォルトテキスト幅の比率（0〜1）。env: DEFAULT_TEXT_WIDTH_RATIO */
  defaultTextWidthRatio: number;
}

function parseNumberEnv(
  value: string | undefined,
  defaultValue: number,
  varName: string
): number {
  if (value === undefined || value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    console.warn(
      `[ConfigLoader] 環境変数 ${varName} の値 "${value}" は有効な数値ではありません。デフォルト値 ${defaultValue} を使用します。`
    );
    return defaultValue;
  }
  return parsed;
}

export function loadConfig(): AppConfig {
  return {
    siteName: process.env.SITE_NAME ?? "yu9824's Notes",
    defaultWidth: parseNumberEnv(process.env.DEFAULT_WIDTH, 1200, "DEFAULT_WIDTH"),
    defaultHeight: parseNumberEnv(process.env.DEFAULT_HEIGHT, 630, "DEFAULT_HEIGHT"),
    defaultTextWidthRatio: parseNumberEnv(
      process.env.DEFAULT_TEXT_WIDTH_RATIO,
      0.8,
      "DEFAULT_TEXT_WIDTH_RATIO"
    ),
  };
}
