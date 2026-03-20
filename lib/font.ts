/**
 * FontLoader: satori 用フォントデータを URL からフェッチし、モジュールスコープでキャッシュするモジュール
 *
 * ウォームリクエスト時の再フェッチを回避するため、モジュールスコープの変数でキャッシュする。
 * フォント読み込みに失敗した場合は警告を出力し、空のフォントリストで処理を続行する。
 */

import type { AppConfig } from "./config";

/** satori の fonts オプションに渡すフォントデータ */
export interface FontData {
  /** フォントファミリー名 */
  name: string;
  /** フォントデータの ArrayBuffer */
  data: ArrayBuffer;
  /** フォントウェイト */
  weight: 400 | 700;
  /** フォントスタイル */
  style: "normal";
}

/** フォント読み込み結果 */
export type FontLoadResult =
  | { ok: true; fonts: FontData[] }
  | { ok: false; fonts: []; warning: string };

/**
 * モジュールスコープのキャッシュ変数
 * Edge Runtime では Worker ごとにモジュールがキャッシュされるため、
 * ウォームスタート時に再フェッチを避けられる
 */
let cachedFonts: FontData[] | null = null;

/**
 * フォントデータをフェッチ（またはキャッシュから返す）する
 *
 * FONT_URL_REGULAR と FONT_URL_BOLD を Promise.all で並列フェッチする。
 * AbortSignal.timeout で各フェッチのタイムアウトを制御する。
 *
 * @param config - AppConfig（フォント URL とタイムアウト設定を含む）
 * @returns FontLoadResult（成功時はフォントデータ配列、失敗時は空配列と警告メッセージ）
 */
export async function loadFonts(config: AppConfig): Promise<FontLoadResult> {
  // キャッシュが存在する場合はそのまま返す（ウォームリクエストの最適化）
  if (cachedFonts !== null) {
    return { ok: true, fonts: cachedFonts };
  }

  try {
    // Regular と Bold を並列フェッチする
    const [regularBuffer, boldBuffer] = await Promise.all([
      fetchFontWithTimeout(config.fontUrlRegular, config.fontFetchTimeoutMs),
      fetchFontWithTimeout(config.fontUrlBold, config.fontFetchTimeoutMs),
    ]);

    const fonts: FontData[] = [
      {
        name: "Noto Sans JP",
        data: regularBuffer,
        weight: 400,
        style: "normal",
      },
      {
        name: "Noto Sans JP",
        data: boldBuffer,
        weight: 700,
        style: "normal",
      },
    ];

    // キャッシュに保存する
    cachedFonts = fonts;

    return { ok: true, fonts };
  } catch (error) {
    // フォントの読み込みに失敗した場合は警告を出力して空リストで続行する
    const message =
      error instanceof Error ? error.message : String(error);
    console.warn(
      `[FontLoader] フォントの読み込みに失敗しました。システムフォントで続行します。エラー: ${message}`
    );
    return {
      ok: false,
      fonts: [],
      warning: message,
    };
  }
}

/**
 * タイムアウト付きでフォントデータをフェッチするヘルパー関数
 *
 * @param url - フォントファイルの URL
 * @param timeoutMs - タイムアウト（ミリ秒）
 * @returns フォントデータの ArrayBuffer
 */
async function fetchFontWithTimeout(
  url: string,
  timeoutMs: number
): Promise<ArrayBuffer> {
  // AbortSignal.timeout でタイムアウトを設定する
  const signal = AbortSignal.timeout(timeoutMs);
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(
      `フォントのフェッチに失敗しました: ${url} (HTTP ${response.status})`
    );
  }

  return response.arrayBuffer();
}

/**
 * テスト用: キャッシュをリセットする
 * 本番コードから呼び出してはいけません
 */
export function _resetFontCache(): void {
  cachedFonts = null;
}
