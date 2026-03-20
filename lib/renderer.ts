/**
 * ImageRenderer: satori / ImageResponse を使って JSX から画像を生成するモジュール
 *
 * SVG 生成は satori を直接呼び出し、PNG 生成は next/og の ImageResponse を使用する。
 * どちらのパスも Cache-Control ヘッダーを上書きできるように設計されている。
 */

import satori from "satori";
import { ImageResponse } from "next/og";
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
 * next/og の ImageResponse を使って PNG Response を生成する。
 * ImageResponse が返す Response を再構築して Cache-Control ヘッダーを上書きできるようにする。
 *
 * @param element - ImageResponse に渡す ReactElement
 * @param options - 画像サイズとフォントデータ
 * @returns PNG 画像を含む Response（Cache-Control ヘッダーは呼び出し元で付与する）
 */
export async function renderPNG(
  element: React.ReactElement,
  options: RenderOptions
): Promise<Response> {
  // next/og の ImageResponse でレンダリングする
  const imageResponse = new ImageResponse(element, {
    width: options.width,
    height: options.height,
    fonts: options.fonts,
  });

  // ImageResponse が返す Response の本体を取得して再構築する
  // これにより Cache-Control ヘッダーを呼び出し元で自由に設定できる
  const body = imageResponse.body;

  return new Response(body, {
    status: 200,
    headers: {
      // Content-Type は PNG に固定する
      "Content-Type": "image/png",
      // Cache-Control は呼び出し元（RequestHandler）が上書きする
    },
  });
}
