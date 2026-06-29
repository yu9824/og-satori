/**
 * PreviewRequestHandler のルートテスト（タスク 5.2）
 *
 * テスト対象: app/api/preview-og/route.ts の GET ハンドラ
 * テスト方針:
 * - production ガード: NODE_ENV=production のとき notFound() で 404 になることを確認する
 * - パラメータ伝播: siteName・色・baseShortSide のオーバーライドが renderTemplate に
 *   正しく渡されることを確認する
 *
 * 依存モジュール（config / font / template / renderer / next/navigation）はモックし、
 * ルートのオーケストレーション（パラメータ組み立て）のみを検証する。parseParams は
 * 純粋関数のため実物を使用する。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// next/navigation の notFound() は呼ばれると例外を投げて以降の処理を中断する挙動を模す
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// 設定は決定的な既知の値を返す
vi.mock("@/lib/config", () => ({
  loadConfig: vi.fn(() => ({
    siteName: "yu9824's Notes",
    defaultWidth: 1200,
    defaultHeight: 630,
    defaultTextWidthRatio: 0.8,
  })),
}));

// フォント読み込みは実ファイル I/O を避けて空配列を返す
vi.mock("@/lib/font", () => ({
  loadFonts: vi.fn(async () => ({ ok: true, fonts: [] })),
}));

// テンプレートはダミー要素を返すスパイ（呼び出し引数の検証に使う）
vi.mock("@/lib/template", () => ({
  renderTemplate: vi.fn(() => ({ __element: true })),
}));

// レンダラは satori / resvg-wasm を呼ばずにダミーの結果を返す
vi.mock("@/lib/renderer", () => ({
  renderSVG: vi.fn(async () => "<svg/>"),
  renderPNG: vi.fn(
    async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "image/png" },
      })
  ),
}));

import { GET } from "@/app/api/preview-og/route";
import { notFound } from "next/navigation";
import { renderTemplate } from "@/lib/template";

const notFoundMock = vi.mocked(notFound);
const renderTemplateMock = vi.mocked(renderTemplate);

/** クエリ文字列からプレビュー用 GET リクエストを生成する */
function buildRequest(query: string): Request {
  return new Request(`http://localhost/api/preview-og${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/preview-og", () => {
  describe("production ガード", () => {
    it("NODE_ENV=production のとき notFound() を呼び出し、レンダリングに到達しない", async () => {
      vi.stubEnv("NODE_ENV", "production");

      await expect(GET(buildRequest("?title=Hello"))).rejects.toThrow(
        "NEXT_NOT_FOUND"
      );
      expect(notFoundMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).not.toHaveBeenCalled();
    });

    it("NODE_ENV=development のとき notFound() を呼ばず 200 を返す", async () => {
      vi.stubEnv("NODE_ENV", "development");

      const response = await GET(buildRequest("?title=Hello"));

      expect(notFoundMock).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("オーバーライドパラメータの伝播", () => {
    it("siteName オーバーライドが config.siteName として renderTemplate に渡される", async () => {
      await GET(buildRequest("?title=Hello&siteName=My%20Custom%20Site"));

      const input = renderTemplateMock.mock.calls[0][0];
      expect(input.config.siteName).toBe("My Custom Site");
    });

    it("siteName 未指定時はデフォルトの siteName が使われる", async () => {
      await GET(buildRequest("?title=Hello"));

      const input = renderTemplateMock.mock.calls[0][0];
      expect(input.config.siteName).toBe("yu9824's Notes");
    });

    it("色オーバーライドが colorOverrides として renderTemplate に渡される", async () => {
      await GET(
        buildRequest(
          "?title=Hello&backgroundColor=%23ff0000&textColor=%2300ff00&accentColor=%230000ff"
        )
      );

      const input = renderTemplateMock.mock.calls[0][0];
      expect(input.colorOverrides).toEqual({
        backgroundColor: "#ff0000",
        textColor: "#00ff00",
        accentColor: "#0000ff",
      });
    });

    it("一部の色のみ指定された場合、指定色のみ設定され他は undefined になる", async () => {
      await GET(buildRequest("?title=Hello&accentColor=%230000ff"));

      const input = renderTemplateMock.mock.calls[0][0];
      expect(input.colorOverrides).toEqual({
        backgroundColor: undefined,
        textColor: undefined,
        accentColor: "#0000ff",
      });
    });

    it("色が一切指定されない場合は colorOverrides が undefined になる", async () => {
      await GET(buildRequest("?title=Hello"));

      const input = renderTemplateMock.mock.calls[0][0];
      expect(input.colorOverrides).toBeUndefined();
    });

    it("baseShortSide（正整数）が renderTemplate に渡される", async () => {
      await GET(buildRequest("?title=Hello&baseShortSide=1260"));

      const input = renderTemplateMock.mock.calls[0][0];
      expect(input.baseShortSide).toBe(1260);
    });

    it("baseShortSide が不正値（非整数）のとき undefined になる", async () => {
      await GET(buildRequest("?title=Hello&baseShortSide=12.5"));

      const input = renderTemplateMock.mock.calls[0][0];
      expect(input.baseShortSide).toBeUndefined();
    });

    it("baseShortSide が 0 以下のとき undefined になる", async () => {
      await GET(buildRequest("?title=Hello&baseShortSide=0"));

      const input = renderTemplateMock.mock.calls[0][0];
      expect(input.baseShortSide).toBeUndefined();
    });

    it("baseShortSide 未指定時は undefined になる", async () => {
      await GET(buildRequest("?title=Hello"));

      const input = renderTemplateMock.mock.calls[0][0];
      expect(input.baseShortSide).toBeUndefined();
    });
  });
});
