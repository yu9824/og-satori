/**
 * TemplateRenderer のスナップショットテスト（タスク 8.3）
 *
 * テスト対象: lib/template.tsx の renderTemplate 関数
 * テスト方針:
 * - 同一入力に対して常に同一の JSX 構造が返されることをスナップショットで確認する
 * - 参照透過性（pure function）の検証
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { renderTemplate, _calcScaleFactor } from "../lib/template";
import type { RenderInput } from "../lib/template";

/** テスト用のデフォルト入力 */
const baseInput: RenderInput = {
  params: {
    title: "テストタイトル",
    width: 1200,
    height: 630,
    textWidth: 960,
    format: "png",
  },
  config: {
    siteName: "yu9824's Notes",
    baseUrl: "http://localhost:3000",
    fontUrlRegular: "http://localhost:3000/fonts/NotoSansJP-Regular.otf",
    fontUrlBold: "http://localhost:3000/fonts/NotoSansJP-Bold.otf",
    fontFetchTimeoutMs: 5000,
    defaultWidth: 1200,
    defaultHeight: 630,
    defaultTextWidthRatio: 0.8,
  },
};

describe("_calcScaleFactor", () => {
  it("400x210 のとき 210/630 ≈ 0.333 を返す", () => {
    expect(_calcScaleFactor(400, 210)).toBeCloseTo(210 / 630);
  });

  it("630x630 のとき 1.0 を返す", () => {
    expect(_calcScaleFactor(630, 630)).toBe(1.0);
  });

  it("1200x630 のとき 1.0 を返す", () => {
    expect(_calcScaleFactor(1200, 630)).toBe(1.0);
  });
});

describe("renderTemplate", () => {
  // ────────────────────────────────────────────────
  // スナップショットテスト
  // ────────────────────────────────────────────────
  describe("スナップショット", () => {
    it("デフォルト入力に対して一定の JSX 構造を返す", () => {
      const element = renderTemplate(baseInput);
      expect(element).toMatchSnapshot();
    });

    it("空タイトルに対して一定の JSX 構造を返す", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, title: "" },
      });
      expect(element).toMatchSnapshot();
    });

    it("長いタイトルに対して一定の JSX 構造を返す", () => {
      const element = renderTemplate({
        ...baseInput,
        params: {
          ...baseInput.params,
          title:
            "これは非常に長いタイトルです。複数行にわたって表示されることを想定しています。テキスト省略機能が正しく動作するかを確認するためのテストです。",
        },
      });
      expect(element).toMatchSnapshot();
    });

    it("異なるサイズに対して一定の JSX 構造を返す", () => {
      const element = renderTemplate({
        ...baseInput,
        params: {
          ...baseInput.params,
          width: 800,
          height: 420,
          textWidth: 640,
        },
      });
      expect(element).toMatchSnapshot();
    });

    it("カスタム siteName に対して一定の JSX 構造を返す", () => {
      const element = renderTemplate({
        ...baseInput,
        config: { ...baseInput.config, siteName: "My Custom Blog" },
      });
      expect(element).toMatchSnapshot();
    });
  });

  // ────────────────────────────────────────────────
  // 参照透過性（同一入力 → 同一出力）の検証
  // ────────────────────────────────────────────────
  describe("参照透過性", () => {
    it("同一入力に対して 2 回呼び出しても同一の結果を返す", () => {
      const element1 = renderTemplate(baseInput);
      const element2 = renderTemplate(baseInput);
      // React.ReactElement の props と type が一致することを確認する
      expect(element1.type).toBe(element2.type);
      expect(JSON.stringify(element1.props)).toBe(
        JSON.stringify(element2.props)
      );
    });
  });

  // ────────────────────────────────────────────────
  // ReactElement の基本的な構造テスト
  // ────────────────────────────────────────────────
  describe("出力の構造検証", () => {
    it("ReactElement を返す", () => {
      const element = renderTemplate(baseInput);
      expect(React.isValidElement(element)).toBe(true);
    });

    it("ルート要素が div である", () => {
      const element = renderTemplate(baseInput);
      expect(element.type).toBe("div");
    });

    it("siteName がテキストとして含まれる", () => {
      const element = renderTemplate(baseInput);
      // JSX を文字列化して siteName が含まれることを確認する
      const json = JSON.stringify(element);
      expect(json).toContain("yu9824's Notes");
    });

    it("title がテキストとして含まれる", () => {
      const element = renderTemplate(baseInput);
      const json = JSON.stringify(element);
      expect(json).toContain("テストタイトル");
    });
  });
});
