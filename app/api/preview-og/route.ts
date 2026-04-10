/**
 * PreviewRequestHandler: プレビュー用 OGP 画像を生成して返す GET ルートハンドラ
 *
 * ローカル開発専用エンドポイント。production 環境（NODE_ENV=production）では 404 を返す。
 * siteName・色・baseShortSide のオーバーライドパラメータを受け付け、/api/og と独立して動作する。
 * 本番エンドポイント /api/og は本ファイルの変更の影響を受けない。
 *
 * エンドポイント: GET /api/preview-og
 * クエリパラメータ:
 *   - /api/og と共通: title, width, height, textWidth, format
 *   - 追加: siteName（config.siteName を上書き）, backgroundColor, textColor, accentColor（CSS hex）,
 *           baseShortSide（正整数、フォントスケーリングの基準短辺）
 */

import { notFound } from "next/navigation";
import { loadConfig } from "@/lib/config";
import { parseParams } from "@/lib/params";
import { loadFonts } from "@/lib/font";
import { renderTemplate } from "@/lib/template";
import type { ColorOverrides } from "@/lib/template";
import { renderSVG, renderPNG } from "@/lib/renderer";

export async function GET(request: Request): Promise<Response> {
  // production ガード: 拡張パラメータが本番環境に露出しないことを保証する
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // 設定を読み込む
  const config = loadConfig();

  // siteName オーバーライド
  const siteNameOverride = searchParams.get("siteName");
  const effectiveConfig = siteNameOverride
    ? { ...config, siteName: siteNameOverride }
    : config;

  // OG パラメータを解析・バリデーション
  const parseResult = parseParams(searchParams, {
    width: config.defaultWidth,
    height: config.defaultHeight,
    textWidthRatio: config.defaultTextWidthRatio,
  });

  if (!parseResult.ok) {
    return new Response(
      JSON.stringify({
        error: parseResult.error.message,
        field: parseResult.error.field,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const params = parseResult.data;

  // 色オーバーライドを構築する
  const backgroundColor = searchParams.get("backgroundColor") ?? undefined;
  const textColor = searchParams.get("textColor") ?? undefined;
  const accentColor = searchParams.get("accentColor") ?? undefined;
  const colorOverrides: ColorOverrides | undefined =
    backgroundColor !== undefined ||
    textColor !== undefined ||
    accentColor !== undefined
      ? { backgroundColor, textColor, accentColor }
      : undefined;

  // baseShortSide のパース（正の整数でなければ undefined）
  const rawBaseShortSide = searchParams.get("baseShortSide");
  const baseShortSideNum =
    rawBaseShortSide !== null ? Number(rawBaseShortSide) : undefined;
  const baseShortSide =
    baseShortSideNum !== undefined &&
    Number.isInteger(baseShortSideNum) &&
    baseShortSideNum >= 1
      ? baseShortSideNum
      : undefined;

  try {
    const fontResult = await loadFonts();
    const fonts = fontResult.fonts;

    const element = renderTemplate({
      params,
      config: effectiveConfig,
      colorOverrides,
      baseShortSide,
    });

    const renderOptions = {
      width: params.width,
      height: params.height,
      fonts,
    };

    if (params.format === "svg") {
      const svg = await renderSVG(element, renderOptions);
      return new Response(svg, {
        status: 200,
        headers: { "Content-Type": "image/svg+xml" },
      });
    } else {
      const pngResponse = await renderPNG(element, renderOptions);

      return new Response(pngResponse.body, {
        status: 200,
        headers: new Headers(pngResponse.headers),
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("[PreviewRequestHandler] レンダリングエラー:", error);
    return new Response(message, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
