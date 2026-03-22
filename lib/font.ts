/**
 * FontLoader: satori 用フォントデータをファイルシステムから読み込み、
 * モジュールスコープでキャッシュするモジュール（Node.js Runtime 用）
 */

import { readFile } from "fs/promises";
import path from "path";

/** satori の fonts オプションに渡すフォントデータ */
export interface FontData {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}

/** フォント読み込み結果 */
export type FontLoadResult =
  | { ok: true; fonts: FontData[] }
  | { ok: false; fonts: []; warning: string };

let cachedFonts: FontData[] | null = null;

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  ) as ArrayBuffer;
}

/**
 * public/fonts/ からフォントを読み込む（またはキャッシュから返す）
 */
export async function loadFonts(): Promise<FontLoadResult> {
  if (cachedFonts !== null) {
    return { ok: true, fonts: cachedFonts };
  }

  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    const [regularBuf, boldBuf] = await Promise.all([
      readFile(path.join(fontsDir, "NotoSansJP-Regular.otf")),
      readFile(path.join(fontsDir, "NotoSansJP-Bold.otf")),
    ]);

    const fonts: FontData[] = [
      {
        name: "Noto Sans JP",
        data: bufferToArrayBuffer(regularBuf),
        weight: 400,
        style: "normal",
      },
      {
        name: "Noto Sans JP",
        data: bufferToArrayBuffer(boldBuf),
        weight: 700,
        style: "normal",
      },
    ];

    cachedFonts = fonts;
    return { ok: true, fonts };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[FontLoader] フォントの読み込みに失敗しました: ${message}`);
    return { ok: false, fonts: [], warning: message };
  }
}

/**
 * テスト用: キャッシュをリセットする
 * 本番コードから呼び出してはいけません
 */
export function _resetFontCache(): void {
  cachedFonts = null;
}
