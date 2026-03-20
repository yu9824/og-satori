/**
 * ParamParser のユニットテスト（タスク 8.1）
 *
 * テスト対象: lib/params.ts の parseParams 関数
 * テスト方針:
 * - title 200 文字制限の検証
 * - 非正整数の寸法パラメータの検証
 * - 不正なフォーマット値の検証
 * - title 省略時に空文字となること
 * - 未定義パラメータが無視されること
 */

import { describe, it, expect } from "vitest";
import { parseParams } from "../lib/params";
import type { ParamDefaults } from "../lib/params";

/** テスト用のデフォルト値 */
const defaults: ParamDefaults = {
  width: 1200,
  height: 630,
  textWidthRatio: 0.8,
};

/** URLSearchParams を作成するヘルパー関数 */
function makeParams(params: Record<string, string>): URLSearchParams {
  return new URLSearchParams(params);
}

describe("parseParams", () => {
  // ────────────────────────────────────────────────
  // 正常系
  // ────────────────────────────────────────────────
  describe("正常系", () => {
    it("全パラメータ省略時はデフォルト値を返す", () => {
      const result = parseParams(makeParams({}), defaults);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.title).toBe("");
      expect(result.data.width).toBe(1200);
      expect(result.data.height).toBe(630);
      // textWidth = Math.floor(1200 * 0.8) = 960
      expect(result.data.textWidth).toBe(960);
      expect(result.data.format).toBe("png");
    });

    it("title が指定された場合はそのまま返す", () => {
      const result = parseParams(
        makeParams({ title: "Hello, World!" }),
        defaults
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.title).toBe("Hello, World!");
    });

    it("日本語タイトルが正しく解析される", () => {
      const result = parseParams(
        makeParams({ title: "Next.js で作る OGP 画像生成サービス" }),
        defaults
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.title).toBe("Next.js で作る OGP 画像生成サービス");
    });

    it("title が空文字の場合は空文字を返す（エラーにならない）", () => {
      const result = parseParams(makeParams({ title: "" }), defaults);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.title).toBe("");
    });

    it("width と height が正の整数の場合は正しく解析される", () => {
      const result = parseParams(
        makeParams({ width: "800", height: "400" }),
        defaults
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.width).toBe(800);
      expect(result.data.height).toBe(400);
    });

    it("textWidth が指定された場合はその値を使用する", () => {
      const result = parseParams(
        makeParams({ textWidth: "700" }),
        defaults
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.textWidth).toBe(700);
    });

    it("format=png の場合は png を返す", () => {
      const result = parseParams(makeParams({ format: "png" }), defaults);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.format).toBe("png");
    });

    it("format=svg の場合は svg を返す", () => {
      const result = parseParams(makeParams({ format: "svg" }), defaults);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.format).toBe("svg");
    });

    it("仕様外のパラメータ（pattern, fontSize 等）は無視される", () => {
      const result = parseParams(
        makeParams({
          title: "Test",
          pattern: "zigzag",
          fontSize: "48",
          textColor: "#ff0000",
        }),
        defaults
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.title).toBe("Test");
      // 仕様外パラメータは OgParams に含まれない
      expect("pattern" in result.data).toBe(false);
      expect("fontSize" in result.data).toBe(false);
    });

    it("title が 200 文字ちょうどの場合はエラーにならない", () => {
      const title = "あ".repeat(200);
      const result = parseParams(makeParams({ title }), defaults);
      expect(result.ok).toBe(true);
    });

    it("textWidth 省略時は width * textWidthRatio の切り捨て値を返す", () => {
      // width=1000, textWidthRatio=0.75 の場合: Math.floor(1000 * 0.75) = 750
      const customDefaults: ParamDefaults = {
        width: 1000,
        height: 500,
        textWidthRatio: 0.75,
      };
      const result = parseParams(makeParams({ width: "1000" }), customDefaults);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.textWidth).toBe(750);
    });
  });

  // ────────────────────────────────────────────────
  // 異常系: title
  // ────────────────────────────────────────────────
  describe("title バリデーション", () => {
    it("title が 201 文字の場合は TITLE_TOO_LONG エラーを返す", () => {
      const title = "あ".repeat(201);
      const result = parseParams(makeParams({ title }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("TITLE_TOO_LONG");
      expect(result.error.field).toBe("title");
    });

    it("title が 1000 文字の場合も TITLE_TOO_LONG エラーを返す", () => {
      const title = "a".repeat(1000);
      const result = parseParams(makeParams({ title }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("TITLE_TOO_LONG");
    });

    it("TITLE_TOO_LONG エラーのメッセージに文字数制限が含まれる", () => {
      const title = "x".repeat(201);
      const result = parseParams(makeParams({ title }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain("200");
    });
  });

  // ────────────────────────────────────────────────
  // 異常系: width, height, textWidth
  // ────────────────────────────────────────────────
  describe("寸法パラメータのバリデーション", () => {
    it("width が 0 の場合は INVALID_DIMENSION エラーを返す", () => {
      const result = parseParams(makeParams({ width: "0" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_DIMENSION");
      expect(result.error.field).toBe("width");
    });

    it("width が負数の場合は INVALID_DIMENSION エラーを返す", () => {
      const result = parseParams(makeParams({ width: "-100" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_DIMENSION");
      expect(result.error.field).toBe("width");
    });

    it("width が小数の場合は INVALID_DIMENSION エラーを返す", () => {
      const result = parseParams(makeParams({ width: "1200.5" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_DIMENSION");
    });

    it("width が文字列の場合は INVALID_DIMENSION エラーを返す", () => {
      const result = parseParams(makeParams({ width: "abc" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_DIMENSION");
    });

    it("height が 0 の場合は INVALID_DIMENSION エラーを返す", () => {
      const result = parseParams(makeParams({ height: "0" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_DIMENSION");
      expect(result.error.field).toBe("height");
    });

    it("height が負数の場合は INVALID_DIMENSION エラーを返す", () => {
      const result = parseParams(makeParams({ height: "-1" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_DIMENSION");
    });

    it("textWidth が 0 の場合は INVALID_DIMENSION エラーを返す", () => {
      const result = parseParams(makeParams({ textWidth: "0" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_DIMENSION");
      expect(result.error.field).toBe("textWidth");
    });

    it("textWidth が小数の場合は INVALID_DIMENSION エラーを返す", () => {
      const result = parseParams(makeParams({ textWidth: "960.5" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_DIMENSION");
    });

    it("INVALID_DIMENSION エラーのメッセージに受け取った値が含まれる", () => {
      const result = parseParams(makeParams({ width: "abc" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain("abc");
    });
  });

  // ────────────────────────────────────────────────
  // 異常系: format
  // ────────────────────────────────────────────────
  describe("format バリデーション", () => {
    it("format が 'gif' の場合は INVALID_FORMAT エラーを返す", () => {
      const result = parseParams(makeParams({ format: "gif" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.field).toBe("format");
    });

    it("format が 'jpeg' の場合は INVALID_FORMAT エラーを返す", () => {
      const result = parseParams(makeParams({ format: "jpeg" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_FORMAT");
    });

    it("format が大文字 'PNG' の場合は INVALID_FORMAT エラーを返す", () => {
      const result = parseParams(makeParams({ format: "PNG" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_FORMAT");
    });

    it("INVALID_FORMAT エラーのメッセージにサポート値が含まれる", () => {
      const result = parseParams(makeParams({ format: "gif" }), defaults);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain("png");
      expect(result.error.message).toContain("svg");
    });
  });

  // ────────────────────────────────────────────────
  // fail-fast: 最初のエラーのみ返すこと
  // ────────────────────────────────────────────────
  describe("fail-fast バリデーション", () => {
    it("title が超過かつ width が不正な場合は title のエラーを先に返す", () => {
      // title のバリデーションが先に行われるため、TITLE_TOO_LONG が返される
      const title = "あ".repeat(201);
      const result = parseParams(
        makeParams({ title, width: "abc" }),
        defaults
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("TITLE_TOO_LONG");
    });
  });
});
