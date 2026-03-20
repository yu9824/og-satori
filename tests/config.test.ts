/**
 * ConfigLoader のユニットテスト（タスク 8.2）
 *
 * テスト対象: lib/config.ts の loadConfig 関数
 * テスト方針:
 * - 有効な環境変数が正しく読み込まれることを確認
 * - 不正な数値型環境変数でデフォルト値にフォールバックし、コンソール警告が出ることを確認
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../lib/config";

describe("loadConfig", () => {
  // テスト前後で環境変数をクリーンアップする
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセットする
    process.env = { ...originalEnv };
    // OGP 関連の環境変数を全て削除する
    delete process.env.SITE_NAME;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_URL;
    delete process.env.FONT_URL_REGULAR;
    delete process.env.FONT_URL_BOLD;
    delete process.env.FONT_FETCH_TIMEOUT_MS;
    delete process.env.DEFAULT_WIDTH;
    delete process.env.DEFAULT_HEIGHT;
    delete process.env.DEFAULT_TEXT_WIDTH_RATIO;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ────────────────────────────────────────────────
  // デフォルト値のテスト
  // ────────────────────────────────────────────────
  describe("デフォルト値", () => {
    it("環境変数が未設定の場合はデフォルト値を返す", () => {
      const config = loadConfig();
      expect(config.siteName).toBe("yu9824's Notes");
      expect(config.fontFetchTimeoutMs).toBe(5000);
      expect(config.defaultWidth).toBe(1200);
      expect(config.defaultHeight).toBe(630);
      expect(config.defaultTextWidthRatio).toBe(0.8);
    });

    it("baseUrl は NEXT_PUBLIC_BASE_URL も VERCEL_URL も未設定の場合 'http://localhost:3000' を返す", () => {
      const config = loadConfig();
      expect(config.baseUrl).toBe("http://localhost:3000");
    });

    it("フォント URL のデフォルトは baseUrl を使って構築される", () => {
      const config = loadConfig();
      expect(config.fontUrlRegular).toBe(
        "http://localhost:3000/fonts/NotoSansJP-Regular.otf"
      );
      expect(config.fontUrlBold).toBe(
        "http://localhost:3000/fonts/NotoSansJP-Bold.otf"
      );
    });
  });

  // ────────────────────────────────────────────────
  // 環境変数の読み込みテスト
  // ────────────────────────────────────────────────
  describe("環境変数の読み込み", () => {
    it("SITE_NAME が設定されている場合はその値を返す", () => {
      process.env.SITE_NAME = "My Blog";
      const config = loadConfig();
      expect(config.siteName).toBe("My Blog");
    });

    it("NEXT_PUBLIC_BASE_URL が設定されている場合はその値を baseUrl として返す", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://example.com";
      const config = loadConfig();
      expect(config.baseUrl).toBe("https://example.com");
    });

    it("VERCEL_URL が設定されている場合は https:// を付与して baseUrl として返す", () => {
      process.env.VERCEL_URL = "my-app.vercel.app";
      const config = loadConfig();
      expect(config.baseUrl).toBe("https://my-app.vercel.app");
    });

    it("NEXT_PUBLIC_BASE_URL が VERCEL_URL より優先される", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://example.com";
      process.env.VERCEL_URL = "my-app.vercel.app";
      const config = loadConfig();
      expect(config.baseUrl).toBe("https://example.com");
    });

    it("FONT_URL_REGULAR が設定されている場合はその値を返す", () => {
      process.env.FONT_URL_REGULAR = "https://cdn.example.com/font-regular.otf";
      const config = loadConfig();
      expect(config.fontUrlRegular).toBe(
        "https://cdn.example.com/font-regular.otf"
      );
    });

    it("FONT_URL_BOLD が設定されている場合はその値を返す", () => {
      process.env.FONT_URL_BOLD = "https://cdn.example.com/font-bold.otf";
      const config = loadConfig();
      expect(config.fontUrlBold).toBe("https://cdn.example.com/font-bold.otf");
    });

    it("FONT_FETCH_TIMEOUT_MS が有効な数値の場合はその値を返す", () => {
      process.env.FONT_FETCH_TIMEOUT_MS = "3000";
      const config = loadConfig();
      expect(config.fontFetchTimeoutMs).toBe(3000);
    });

    it("DEFAULT_WIDTH が有効な数値の場合はその値を返す", () => {
      process.env.DEFAULT_WIDTH = "1600";
      const config = loadConfig();
      expect(config.defaultWidth).toBe(1600);
    });

    it("DEFAULT_HEIGHT が有効な数値の場合はその値を返す", () => {
      process.env.DEFAULT_HEIGHT = "900";
      const config = loadConfig();
      expect(config.defaultHeight).toBe(900);
    });

    it("DEFAULT_TEXT_WIDTH_RATIO が有効な数値の場合はその値を返す", () => {
      process.env.DEFAULT_TEXT_WIDTH_RATIO = "0.75";
      const config = loadConfig();
      expect(config.defaultTextWidthRatio).toBe(0.75);
    });
  });

  // ────────────────────────────────────────────────
  // 不正な数値型環境変数のフォールバックテスト
  // ────────────────────────────────────────────────
  describe("不正な数値型環境変数のフォールバック", () => {
    it("FONT_FETCH_TIMEOUT_MS が 'abc' の場合はデフォルト値 5000 を使用し、コンソール警告を出す", () => {
      process.env.FONT_FETCH_TIMEOUT_MS = "abc";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const config = loadConfig();

      expect(config.fontFetchTimeoutMs).toBe(5000);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("FONT_FETCH_TIMEOUT_MS")
      );
      warnSpy.mockRestore();
    });

    it("DEFAULT_WIDTH が 'invalid' の場合はデフォルト値 1200 を使用し、コンソール警告を出す", () => {
      process.env.DEFAULT_WIDTH = "invalid";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const config = loadConfig();

      expect(config.defaultWidth).toBe(1200);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("DEFAULT_WIDTH")
      );
      warnSpy.mockRestore();
    });

    it("DEFAULT_HEIGHT が 'NaN' の場合はデフォルト値 630 を使用し、コンソール警告を出す", () => {
      process.env.DEFAULT_HEIGHT = "NaN";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const config = loadConfig();

      expect(config.defaultHeight).toBe(630);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("DEFAULT_HEIGHT")
      );
      warnSpy.mockRestore();
    });

    it("DEFAULT_TEXT_WIDTH_RATIO が 'bad' の場合はデフォルト値 0.8 を使用し、コンソール警告を出す", () => {
      process.env.DEFAULT_TEXT_WIDTH_RATIO = "bad";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const config = loadConfig();

      expect(config.defaultTextWidthRatio).toBe(0.8);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("DEFAULT_TEXT_WIDTH_RATIO")
      );
      warnSpy.mockRestore();
    });

    it("コンソール警告メッセージに不正な値が含まれる", () => {
      process.env.DEFAULT_WIDTH = "bad-value";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      loadConfig();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("bad-value")
      );
      warnSpy.mockRestore();
    });
  });
});
