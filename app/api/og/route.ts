/**
 * RequestHandler: OGP 画像を生成して返す GET ルートハンドラ
 *
 * Vercel Edge Runtime で動作する。
 * URLクエリパラメータを解析し、フォントを読み込み、テンプレートを生成して画像を返す。
 *
 * エンドポイント: GET /api/og
 * - format=png（デフォルト）: image/png を返す
 * - format=svg: image/svg+xml を返す
 * - 不正なパラメータ: 400 JSON エラーを返す
 * - レンダリング失敗: 500 プレーンテキストエラーを返す
 */

// Vercel Edge Runtime を明示的に指定する
export const runtime = "edge";

// Cache-Control ヘッダー: 7日間のパブリックキャッシュ + 1日間の stale-while-revalidate
const CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400";

import { loadConfig } from "@/lib/config";
import { parseParams } from "@/lib/params";
import { loadFonts } from "@/lib/font";
import { renderTemplate } from "@/lib/template";
import { renderSVG, renderPNG } from "@/lib/renderer";

/**
 * GET /api/og
 *
 * @param request - Next.js の Request オブジェクト
 * @returns OGP 画像レスポンス（SVG または PNG）
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // 1. 設定を読み込む（環境変数から）
  const config = loadConfig();

  // 2. クエリパラメータを解析・バリデーションする
  const parseResult = parseParams(searchParams, {
    width: config.defaultWidth,
    height: config.defaultHeight,
    textWidthRatio: config.defaultTextWidthRatio,
  });

  // バリデーションエラーの場合は 400 を返す
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

  try {
    // 3. フォントを読み込む（キャッシュがある場合はキャッシュから返す）
    const fontResult = await loadFonts(config);
    // フォント読み込み失敗時は空のフォントリストで続行する（要件 4.5）
    const fonts = fontResult.fonts;

    // 4. テンプレートを生成する（JSX → ReactElement）
    const element = renderTemplate({ params, config });

    const renderOptions = {
      width: params.width,
      height: params.height,
      fonts,
    };

    // 5. 画像をレンダリングしてレスポンスを返す
    if (params.format === "svg") {
      // SVG フォーマット
      const svg = await renderSVG(element, renderOptions);
      return new Response(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": CACHE_CONTROL,
        },
      });
    } else {
      // PNG フォーマット（デフォルト）
      // resvg WASM は public/ から静的配信する（Edge Function の JS バンドルサイズを削減するため）
      const resvgWasmUrl = `${config.baseUrl}/resvg.wasm`;
      const pngResponse = await renderPNG(element, renderOptions, resvgWasmUrl);

      // Cache-Control ヘッダーを付与して返す
      const headers = new Headers(pngResponse.headers);
      headers.set("Cache-Control", CACHE_CONTROL);

      return new Response(pngResponse.body, {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    // レンダリング例外をすべて catch して 500 プレーンテキストレスポンスを返す
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("[RequestHandler] レンダリングエラー:", error);
    return new Response(message, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
