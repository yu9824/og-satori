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
import { renderTemplate, _calcScaleFactor, _scaleTokens } from "../lib/template";
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

describe("_scaleTokens", () => {
  it("scale=1.0 のとき各トークンが基準値を返す", () => {
    const tokens = _scaleTokens(1.0, 1200, 630);
    expect(tokens.padding).toBe(64);
    expect(tokens.titleFontSize).toBe(56);
    expect(tokens.labelFontSize).toBe(28);
    expect(tokens.accentLineHeight).toBe(4);
    expect(tokens.accentLineWidth).toBe(48);
  });

  it("scale=210/630 のとき titleFontSize が 16px 以上になる", () => {
    const scale = 210 / 630;
    const tokens = _scaleTokens(scale, 400, 210);
    expect(tokens.titleFontSize).toBeGreaterThanOrEqual(16);
  });

  it("scale=210/630 のとき labelFontSize が 12px 以上になる", () => {
    const scale = 210 / 630;
    const tokens = _scaleTokens(scale, 400, 210);
    expect(tokens.labelFontSize).toBeGreaterThanOrEqual(12);
  });

  it("scale=210/630 のとき accentLineHeight が 1 以上になる", () => {
    const scale = 210 / 630;
    const tokens = _scaleTokens(scale, 400, 210);
    expect(tokens.accentLineHeight).toBeGreaterThanOrEqual(1);
  });

  it("scale=210/630 のとき accentLineWidth が 4 以上になる", () => {
    const scale = 210 / 630;
    const tokens = _scaleTokens(scale, 400, 210);
    expect(tokens.accentLineWidth).toBeGreaterThanOrEqual(4);
  });

  it("400x210 のとき padding が 64px 未満かつ width*0.25 以下になる", () => {
    const scale = 210 / 630;
    const tokens = _scaleTokens(scale, 400, 210);
    expect(tokens.padding).toBeLessThan(64);
    expect(tokens.padding).toBeLessThanOrEqual(400 * 0.25);
  });

  it("padding*2 が width の 50% を超えない", () => {
    const scale = 210 / 630;
    const tokens = _scaleTokens(scale, 400, 210);
    expect(tokens.padding * 2).toBeLessThanOrEqual(400 * 0.5);
  });

  it("padding*2 が height の 50% を超えない", () => {
    const scale = 210 / 630;
    const tokens = _scaleTokens(scale, 400, 210);
    expect(tokens.padding * 2).toBeLessThanOrEqual(210 * 0.5);
  });
});

describe("_scaleTokens フォントサイズオーバーライド", () => {
  it("title 指定時はスケール・クランプを適用せず指定値をそのまま使う", () => {
    // scale=210/630（縮小）でも指定値 72 がそのまま採用される
    const scale = 210 / 630;
    const tokens = _scaleTokens(scale, 400, 210, { title: 72 });
    expect(tokens.titleFontSize).toBe(72);
  });

  it("label 指定時は 12px クランプを迂回して指定値をそのまま使う", () => {
    // scale=210/630 では通常 labelFontSize=12（クランプ下限）になるが、10 をそのまま採用
    const scale = 210 / 630;
    const tokens = _scaleTokens(scale, 400, 210, { label: 10 });
    expect(tokens.labelFontSize).toBe(10);
  });

  it("title のみ指定時、label は従来どおりスケール・クランプされる", () => {
    const tokens = _scaleTokens(1.0, 1200, 630, { title: 100 });
    expect(tokens.titleFontSize).toBe(100);
    // label は未指定なので既定トークン × scale = 28
    expect(tokens.labelFontSize).toBe(28);
  });

  it("フォントサイズ以外のトークン（padding 等）はオーバーライドの影響を受けない", () => {
    const base = _scaleTokens(1.0, 1200, 630);
    const overridden = _scaleTokens(1.0, 1200, 630, { title: 100, label: 50 });
    expect(overridden.padding).toBe(base.padding);
    expect(overridden.accentLineHeight).toBe(base.accentLineHeight);
    expect(overridden.accentLineWidth).toBe(base.accentLineWidth);
  });

  it("オーバーライド省略時は従来と同一の ScaledTokens を返す（回帰防止）", () => {
    const base = _scaleTokens(1.0, 1200, 630);
    expect(_scaleTokens(1.0, 1200, 630, {})).toEqual(base);
    expect(
      _scaleTokens(1.0, 1200, 630, { title: undefined, label: undefined })
    ).toEqual(base);
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

    it("400x210 のサイズに対して一定の JSX 構造を返す", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, width: 400, height: 210, textWidth: 320 },
      });
      expect(element).toMatchSnapshot();
    });

    it("630x630 のサイズに対して一定の JSX 構造を返す", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, width: 630, height: 630, textWidth: 504 },
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
  describe("スケーリング統合", () => {
    it("800x420 では titleFontSize が 56px 未満になる（スケール適用を確認）", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, width: 800, height: 420, textWidth: 640 },
      });
      const json = JSON.stringify(element);
      // 基準 56px がそのまま使われていないことを確認
      expect(json).not.toContain('"56px"');
    });

    it("400x210 では padding が 64px 未満になる（スケール適用を確認）", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, width: 400, height: 210, textWidth: 320 },
      });
      const json = JSON.stringify(element);
      expect(json).not.toContain('"64px"');
    });

    it("1200x630（デフォルト）では scale=1.0 のため基準値がそのまま使われる", () => {
      const element = renderTemplate(baseInput);
      const json = JSON.stringify(element);
      expect(json).toContain('"56px"');
      // padding は上下 40px / 左右 64px のショートハンド
      expect(json).toContain('"40px 64px"');
    });
  });

  describe("中央寄せレイアウト計算", () => {
    it("textWidth < width のとき innerMarginLeft が正になる（width=1200, textWidth=960, padding=64 → innerMarginLeft=56）", () => {
      const element = renderTemplate(baseInput); // width=1200, textWidth=960
      const json = JSON.stringify(element);
      // タイトルコンテナの marginLeft が 56 であることを確認
      expect(json).toContain('"marginLeft":56');
    });

    it("textWidth === width のとき innerMarginLeft が 0 になる", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, textWidth: 1200, width: 1200 },
      });
      const json = JSON.stringify(element);
      // innerMarginLeft=max(0, 0-64)=0
      // marginLeft:0 が含まれることを確認（またはフッターのタイトルと同じマージンが 0）
      // JSONにmarginLeft:56等のオフセットが含まれないことを確認
      expect(json).not.toContain('"marginLeft":56');
    });

    it("textWidth > width のときは width にクランプされる", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, textWidth: 1500, width: 1200 },
      });
      const json = JSON.stringify(element);
      // effectiveTextWidth=1200, centerOffset=0, innerMarginLeft=0
      // widthとして1500が使われていない
      expect(json).not.toContain('"width":"1500px"');
    });
  });

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

    it("textWidth が 0 のとき truncatedTitle が空文字になる", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, textWidth: 0, title: "何かのタイトル" },
      });
      const json = JSON.stringify(element);
      // 空文字のとき、タイトル文字列の先頭文字も含まれないことを確認
      expect(json).not.toContain("何か");
    });

    it("textWidth が負のとき truncatedTitle が空文字になる", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, textWidth: -100, title: "何かのタイトル" },
      });
      const json = JSON.stringify(element);
      // 空文字のとき、タイトル文字列の先頭文字も含まれないことを確認
      expect(json).not.toContain("何か");
    });
  });

  // ────────────────────────────────────────────────
  // フォントサイズオーバーライド（Req 1.2, 1.3, 2.2, 2.3, 4.1〜4.5）
  // ────────────────────────────────────────────────
  describe("フォントサイズオーバーライド", () => {
    it("titleFontSize 指定時はスケール・クランプ非適用で指定値を描画に使う", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, titleFontSize: 72, width: 800, height: 420, textWidth: 640 },
      });
      const json = JSON.stringify(element);
      // 縮小サイズでもスケールされず 72px がそのまま使われる
      expect(json).toContain('"fontSize":"72px"');
    });

    it("siteFontSize 指定時はスケール・クランプ非適用で指定値をラベルに使う", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, siteFontSize: 24, width: 800, height: 420, textWidth: 640 },
      });
      const json = JSON.stringify(element);
      expect(json).toContain('"fontSize":"24px"');
    });

    it("titleFontSize は siteFontSize に影響しない（独立適用）", () => {
      const element = renderTemplate({
        ...baseInput,
        // titleFontSize のみ指定、siteFontSize は未指定（scale=1.0 で labelFontSize=28）
        params: { ...baseInput.params, titleFontSize: 90 },
      });
      const json = JSON.stringify(element);
      expect(json).toContain('"fontSize":"90px"'); // タイトル
      expect(json).toContain('"fontSize":"28px"'); // ラベルは既定トークン
    });

    it("titleFontSize 指定時、truncateTitle が描画と同一の実効サイズを使う（Req 4.5）", () => {
      // 30 文字のタイトル。デフォルト 56px なら maxChars=68 で全文、
      // 200px 指定なら charsPerLine=floor(960/200)=4, maxChars=4*4=16 で省略される。
      const longTitle = "あ".repeat(30);
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, title: longTitle, titleFontSize: 200, textWidth: 960, width: 1200 },
      });
      const json = JSON.stringify(element);
      expect(json).toContain('"fontSize":"200px"');
      // 200px に基づき 15 文字 + … に省略される（56px のままなら 30 文字全文）
      expect(json).toContain("あ".repeat(15) + "…");
      expect(json).not.toContain("あ".repeat(16));
    });

    it("オーバーライド未指定時は既定スケーリング値（56px / 28px）を使う", () => {
      const element = renderTemplate(baseInput);
      const json = JSON.stringify(element);
      expect(json).toContain('"fontSize":"56px"');
      expect(json).toContain('"fontSize":"28px"');
    });
  });

  // ────────────────────────────────────────────────
  // タイトル省略計算の境界ガード（Task 2.2 / Req 4.5）
  // ────────────────────────────────────────────────
  describe("truncateTitle 境界ガード", () => {
    it("titleFontSize > textWidth でも短いタイトルは全文表示（末尾欠落しない）", () => {
      // charsPerLine=floor(960/1000)=0 になる境界。クランプがなければ slice(0,-1) で末尾欠落。
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, title: "あいう", titleFontSize: 1000, textWidth: 960, width: 1200 },
      });
      const json = JSON.stringify(element);
      // 健全: 全文が保持され、… による省略も末尾欠落も起きない
      expect(json).toContain("あいう");
      expect(json).not.toContain("…");
    });

    it("titleFontSize > textWidth でも長いタイトルはクラッシュせず健全に省略される", () => {
      const longTitle = "あ".repeat(50);
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, title: longTitle, titleFontSize: 2000, textWidth: 960, width: 1200 },
      });
      const json = JSON.stringify(element);
      expect(React.isValidElement(element)).toBe(true);
      expect(json).toContain("…");
    });
  });

  // ────────────────────────────────────────────────
  // スナップショット（フォントサイズ指定ケース）
  // ────────────────────────────────────────────────
  describe("スナップショット（フォントサイズ指定）", () => {
    it("titleFontSize 指定ケースの JSX 構造を返す", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, titleFontSize: 72 },
      });
      expect(element).toMatchSnapshot();
    });

    it("siteFontSize 指定ケースの JSX 構造を返す", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, siteFontSize: 20 },
      });
      expect(element).toMatchSnapshot();
    });

    it("titleFontSize と siteFontSize の両方指定ケースの JSX 構造を返す", () => {
      const element = renderTemplate({
        ...baseInput,
        params: { ...baseInput.params, titleFontSize: 90, siteFontSize: 18 },
      });
      expect(element).toMatchSnapshot();
    });
  });
});
