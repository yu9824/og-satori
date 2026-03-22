/**
 * TemplateRenderer: OGP 画像テンプレートを JSX で実装するモジュール
 *
 * satori に渡す ReactElement を生成する純粋関数です。副作用はありません。
 * フォークして別のブログに適用する場合は、ファイル先頭のデザイントークンを変更するだけでカスタマイズできます。
 *
 * 【satori の CSS 制約】
 * - Flexbox のみ対応（Grid は非対応）
 * - calc() は非対応
 * - WOFF2 は非対応（OTF/TTF を使用）
 * - useState/useEffect は使用不可
 */

import React from "react";
import type { AppConfig } from "./config";
import type { OgParams } from "./params";

// ── SCALE CONSTANTS ────────────────────────────────────────────────────────

/** スケール係数の基準となる短辺（px）。min(1200, 630) = 630 */
const BASE_SHORT_SIDE = 630;

/**
 * 画像の短辺を基準とするスケール係数を算出する純粋関数
 *
 * `_` プレフィックスはテスト専用公開関数であることを示す。
 *
 * @param width - 画像幅（px）
 * @param height - 画像高さ（px）
 * @returns `min(width, height) / BASE_SHORT_SIDE`
 */
export function _calcScaleFactor(width: number, height: number): number {
  return Math.min(width, height) / BASE_SHORT_SIDE;
}

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────
// ★ カスタマイズはここだけ変更すればOK
// ★ フォークして別のブログに適用する場合は、このブロックの値を変更してください

/** 背景色（ダークスレート） */
const BACKGROUND_COLOR = "#0f172a";

/** 本文・タイトルの文字色（明るいグレー） */
const TEXT_COLOR = "#f1f5f9";

/** アクセントカラー（スカイブルー）。ブログ名の下線などに使用 */
const ACCENT_COLOR = "#38bdf8";

/** タイトルの基準フォントサイズ（px） */
const TITLE_FONT_SIZE = 56;

/** ブログ名ラベルのフォントサイズ（px） */
const LABEL_FONT_SIZE = 28;

/** 外周の余白（px） */
const PADDING = 64;

/** アクセントラインの高さ（px） */
const ACCENT_LINE_HEIGHT = 4;

/** アクセントラインの幅（px） */
const ACCENT_LINE_WIDTH = 48;

// ── END DESIGN TOKENS ──────────────────────────────────────────────────────

// ── SCALED TOKENS ──────────────────────────────────────────────────────────

/** スケーリング済みデザイントークンの型 */
interface ScaledTokens {
  padding: number;
  titleFontSize: number;
  labelFontSize: number;
  accentLineHeight: number;
  accentLineWidth: number;
}

/**
 * スケール係数と画像サイズを受け取り、クランプ済みデザイントークンを返す純粋関数
 *
 * `_` プレフィックスはテスト専用公開関数であることを示す。
 *
 * @param scale - スケール係数（`_calcScaleFactor` の戻り値）
 * @param width - 画像幅（px）
 * @param height - 画像高さ（px）
 * @returns クランプ済みの `ScaledTokens`
 */
export function _scaleTokens(
  scale: number,
  width: number,
  height: number
): ScaledTokens {
  return {
    padding: Math.max(
      1,
      Math.min(PADDING * scale, width * 0.25, height * 0.25)
    ),
    titleFontSize: Math.max(16, TITLE_FONT_SIZE * scale),
    labelFontSize: Math.max(12, LABEL_FONT_SIZE * scale),
    accentLineHeight: Math.max(1, ACCENT_LINE_HEIGHT * scale),
    accentLineWidth: Math.max(4, ACCENT_LINE_WIDTH * scale),
  };
}

// ── END SCALED TOKENS ──────────────────────────────────────────────────────

/** テンプレートへの入力 */
export interface RenderInput {
  /** URLクエリパラメータから解析された OgParams */
  params: OgParams;
  /** 環境変数から読み取った AppConfig */
  config: AppConfig;
}

/**
 * OgParams と AppConfig から satori 用 ReactElement を生成する純粋関数
 *
 * 同一の入力に対して常に同一の出力を返す（参照透過性）。
 * テキスト折り返しは textWidth で制御し、3 行を超えた場合は「…」で省略する。
 *
 * @param input - RenderInput（params と config を含む）
 * @returns satori が受け付ける純粋 JSX 要素
 */
export function renderTemplate(input: RenderInput): React.ReactElement {
  const { params, config } = input;
  const { title, width, height, textWidth } = params;
  const { siteName } = config;

  // タイトルが長すぎる場合の手動省略処理
  // satori の -webkit-line-clamp は部分サポートのため、フォールバックとして実装する
  const truncatedTitle = truncateTitle(title, textWidth);

  return (
    <div
      style={{
        // 外枠: 全体をカバーする Flex コンテナ
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: BACKGROUND_COLOR,
        padding: `${PADDING}px`,
        fontFamily: '"OGSansJP", sans-serif',
        boxSizing: "border-box",
      }}
    >
      {/* タイトルエリア: 上部に配置 */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
        }}
      >
        <div
          style={{
            // テキスト折り返し制御: textWidth でテキスト幅を制限する
            display: "flex",
            flexDirection: "column",
            width: `${textWidth}px`,
            maxWidth: `${textWidth}px`,
          }}
        >
          <span
            style={{
              fontSize: `${TITLE_FONT_SIZE}px`,
              fontWeight: 700,
              color: TEXT_COLOR,
              lineHeight: 1.4,
              wordBreak: "break-all",
              // 3 行省略: satori での動作確認が必要
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {truncatedTitle}
          </span>
        </div>
      </div>

      {/* フッターエリア: ブログ名を下部に配置 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${ACCENT_LINE_HEIGHT * 3}px`,
        }}
      >
        {/* アクセントライン */}
        <div
          style={{
            display: "flex",
            width: `${ACCENT_LINE_WIDTH}px`,
            height: `${ACCENT_LINE_HEIGHT}px`,
            backgroundColor: ACCENT_COLOR,
            borderRadius: `${ACCENT_LINE_HEIGHT / 2}px`,
          }}
        />
        {/* ブログ名 */}
        <span
          style={{
            fontSize: `${LABEL_FONT_SIZE}px`,
            fontWeight: 400,
            color: ACCENT_COLOR,
          }}
        >
          {siteName}
        </span>
      </div>
    </div>
  );
}

/**
 * タイトルを指定された幅に収まるように省略するヘルパー関数
 *
 * satori の -webkit-line-clamp が動作しない場合のフォールバックとして、
 * 概算で 3 行を超える文字数でスライスして「…」を付与する。
 * 正確な行数計算はフォントメトリクスに依存するため、ここでは文字数ベースの近似値を使う。
 *
 * @param title - 元のタイトル文字列
 * @param textWidth - テキスト描画エリアの幅（px）
 * @returns 省略済みのタイトル文字列
 */
function truncateTitle(title: string, textWidth: number): string {
  if (!title) return title;

  // 1 行あたりの概算文字数（フォントサイズとテキスト幅から計算）
  // TITLE_FONT_SIZE * 0.6 は半角文字の概算幅（全角文字はその 2 倍）
  // ここでは全角文字基準で計算する（日本語タイトルを想定）
  const charsPerLine = Math.floor(textWidth / TITLE_FONT_SIZE);
  const maxChars = charsPerLine * 3; // 3 行分

  if (title.length <= maxChars) {
    return title;
  }

  // 省略記号を付与して返す
  return title.slice(0, maxChars - 1) + "…";
}
