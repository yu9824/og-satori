/**
 * ImageRenderer: satori と resvg-wasm を使って JSX から画像を生成するモジュール
 *
 * SVG 生成は satori を直接呼び出し、PNG 生成は satori で SVG を生成してから
 * @resvg/resvg-wasm で PNG に変換する。
 * next/og の二重バンドルを避けるため、next/og は使用しない。
 */

import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { readFile } from "fs/promises";
import path from "path";
import type React from "react";
import type { FontData } from "./font";

/** SVG / PNG レンダリングの共通オプション */
export interface RenderOptions {
  /** 画像の幅（px） */
  width: number;
  /** 画像の高さ（px） */
  height: number;
  /** satori に渡すフォントデータの配列 */
  fonts: FontData[];
}

// resvg WASM の初期化をキャッシュする（ウォームリクエストで再初期化を避ける）
let resvgInitialized = false;

/**
 * resvg WASM を初期化する（初回のみ読み込む）
 *
 * Node.js runtime で fs.readFile を使って public/resvg.wasm を読み込む。
 */
async function ensureResvgInit(): Promise<void> {
  if (resvgInitialized) return;
  const wasm = await readFile(path.join(process.cwd(), "public", "resvg.wasm"));
  await initWasm(wasm);
  resvgInitialized = true;
}

/**
 * JSX から SVG 文字列を生成する（タスク 6.1）
 *
 * satori を直接呼び出して SVG 文字列を生成する。
 * フォントデータを satori のオプションとして渡す。
 *
 * @param element - satori に渡す ReactElement
 * @param options - 画像サイズとフォントデータ
 * @returns SVG 文字列
 */
export async function renderSVG(
  element: React.ReactElement,
  options: RenderOptions
): Promise<string> {
  const svg = await satori(element, {
    width: options.width,
    height: options.height,
    fonts: options.fonts,
  });
  return svg;
}

/**
 * JSX から PNG Response を生成する（タスク 6.2）
 *
 * satori で SVG を生成し、@resvg/resvg-wasm で PNG に変換する。
 * next/og の ImageResponse は使用しない（二重バンドルによる 1 MB 超過を避けるため）。
 *
 * @param element - satori に渡す ReactElement
 * @param options - 画像サイズとフォントデータ
 * @returns PNG 画像を含む Response（Cache-Control ヘッダーは呼び出し元で付与する）
 */
export async function renderPNG(
  element: React.ReactElement,
  options: RenderOptions
): Promise<Response> {
  // satori で SVG を生成する
  const svg = await renderSVG(element, options);

  // resvg WASM を初期化する（初回のみ）
  await ensureResvgInit();

  // SVG を PNG バイト列に変換する
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" },
  });
  const pngData = resvg.render();
  // Blob でラップして Edge Runtime の BodyInit 型と互換性を確保する
  // resvg-wasm の asPng() が返す Uint8Array<ArrayBufferLike> を
  // 標準の ArrayBuffer に変換して TypeScript の型制約を満たす
  const rawPng = pngData.asPng();
  const pngArrayBuffer = rawPng.buffer.slice(
    rawPng.byteOffset,
    rawPng.byteOffset + rawPng.byteLength
  ) as ArrayBuffer;
  const pngBlob = new Blob([pngArrayBuffer], { type: "image/png" });

  return new Response(pngBlob, {
    status: 200,
    headers: {
      // Content-Type は PNG に固定する
      "Content-Type": "image/png",
      // Cache-Control は呼び出し元（RequestHandler）が上書きする
    },
  });
}
