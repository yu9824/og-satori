"use client";

/**
 * ConfigPreviewClient: デザイントークン設定プレビューのクライアントコンポーネント
 *
 * siteName/色/defaultTextWidthRatio/baseShortSide コントロールを提供し、
 * バリデーション後に /api/preview-og URL を更新する。
 * 「スニペットをコピー」で lib/config.ts と lib/template.tsx への変更スクリプトをコピーする。
 * すべての状態は useState でエフェメラルに管理する（永続化なし）。
 */

import { useState } from "react";
import { parseParams } from "@/lib/params";

interface ConfigPreviewState {
  title: string;
  width: number;
  height: number;
  textWidth: number;
  siteName: string;
  defaultTextWidthRatio: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  baseShortSide: number;
}

interface ConfigPreviewClientProps {
  initialConfig: ConfigPreviewState;
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$/;

function validateConfigState(state: ConfigPreviewState): string | null {
  if (!state.siteName.trim()) return "siteName は空にできません";
  if (!HEX_COLOR_REGEX.test(state.backgroundColor))
    return `backgroundColor は CSS hex 形式で指定してください（例: #ecf2f5）`;
  if (!HEX_COLOR_REGEX.test(state.textColor))
    return `textColor は CSS hex 形式で指定してください（例: #3b3838）`;
  if (!HEX_COLOR_REGEX.test(state.accentColor))
    return `accentColor は CSS hex 形式で指定してください（例: #45859c）`;
  if (!Number.isInteger(state.baseShortSide) || state.baseShortSide < 1)
    return "baseShortSide は正の整数で指定してください";
  return null;
}

function buildPreviewOgUrl(state: ConfigPreviewState): string {
  const params = new URLSearchParams({
    title: state.title,
    width: String(state.width),
    height: String(state.height),
    textWidth: String(state.textWidth),
    siteName: state.siteName,
    backgroundColor: state.backgroundColor,
    textColor: state.textColor,
    accentColor: state.accentColor,
    baseShortSide: String(state.baseShortSide),
  });
  return `/api/preview-og?${params.toString()}`;
}

function buildConfigSnippet(state: ConfigPreviewState): string {
  return `// ---- lib/config.ts のデフォルト値を変更 ----
// siteName 行の ?? 右辺を変更してください:
//   siteName: process.env.SITE_NAME ?? "${state.siteName}",
// defaultTextWidthRatio 行の第2引数を変更してください:
//   defaultTextWidthRatio: parseNumberEnv(process.env.DEFAULT_TEXT_WIDTH_RATIO, ${state.defaultTextWidthRatio}, "DEFAULT_TEXT_WIDTH_RATIO"),

// ---- lib/template.tsx の定数を変更 ----
const BACKGROUND_COLOR = "${state.backgroundColor}";
const TEXT_COLOR = "${state.textColor}";
const ACCENT_COLOR = "${state.accentColor}";
const BASE_SHORT_SIDE = ${state.baseShortSide};`;
}

export function ConfigPreviewClient({ initialConfig }: ConfigPreviewClientProps) {
  const [state, setState] = useState<ConfigPreviewState>(initialConfig);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(() => {
    const configError = validateConfigState(initialConfig);
    return configError ? "" : buildPreviewOgUrl(initialConfig);
  });
  const [snippetCopied, setSnippetCopied] = useState(false);

  function handleChange(updates: Partial<ConfigPreviewState>) {
    const newState = { ...state, ...updates };

    // defaultTextWidthRatio 変更時に textWidth を再計算
    if ("defaultTextWidthRatio" in updates) {
      newState.textWidth = Math.floor(
        newState.width * newState.defaultTextWidthRatio
      );
    }

    setState(newState);

    // OGパラメータのバリデーション
    const sp = new URLSearchParams({
      title: newState.title,
      width: String(newState.width),
      height: String(newState.height),
      textWidth: String(newState.textWidth),
    });
    const ogResult = parseParams(sp, {
      width: newState.width,
      height: newState.height,
      textWidthRatio: newState.defaultTextWidthRatio,
    });

    if (!ogResult.ok) {
      setValidationError(ogResult.error.message);
      return;
    }

    // 設定パラメータのバリデーション
    const configError = validateConfigState(newState);
    if (configError) {
      setValidationError(configError);
      return;
    }

    setValidationError(null);
    setPreviewUrl(buildPreviewOgUrl(newState));
  }

  async function handleSnippetCopy() {
    const snippet = buildConfigSnippet(state);
    await navigator.clipboard.writeText(snippet);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  }

  const inputStyle = {
    padding: "6px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };

  const readonlyInputStyle = {
    ...inputStyle,
    backgroundColor: "#f5f5f5",
    color: "#666",
  };

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "sans-serif",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
        設定プレビュー（ローカル専用）
      </h1>
      <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>
        この画面は <code>NODE_ENV=production</code> では 404 になります。
        title/width/height は{" "}
        <a href="/preview" style={{ color: "#0070f3" }}>
          /preview
        </a>{" "}
        で変更してください。
      </p>

      <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
        {/* コントロールパネル */}
        <div
          style={{
            minWidth: "320px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* 読み取り専用フィールド */}
          <fieldset
            style={{
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "12px",
            }}
          >
            <legend
              style={{ fontWeight: "bold", fontSize: "13px", color: "#888" }}
            >
              読み取り専用（/preview で変更）
            </legend>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <label
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <span style={{ fontSize: "13px" }}>title</span>
                <input
                  type="text"
                  value={state.title}
                  readOnly
                  style={readonlyInputStyle}
                />
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <label
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "13px" }}>width</span>
                  <input
                    type="number"
                    value={state.width}
                    readOnly
                    style={readonlyInputStyle}
                  />
                </label>
                <label
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "13px" }}>height</span>
                  <input
                    type="number"
                    value={state.height}
                    readOnly
                    style={readonlyInputStyle}
                  />
                </label>
              </div>
            </div>
          </fieldset>

          {/* 編集可能フィールド */}
          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>siteName</span>
            <input
              type="text"
              value={state.siteName}
              onChange={(e) => handleChange({ siteName: e.target.value })}
              style={inputStyle}
              placeholder="ブログ名"
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>
              defaultTextWidthRatio (0〜1)
            </span>
            <input
              type="number"
              value={state.defaultTextWidthRatio}
              onChange={(e) =>
                handleChange({ defaultTextWidthRatio: Number(e.target.value) })
              }
              style={inputStyle}
              min="0.01"
              max="1"
              step="0.01"
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>backgroundColor (hex)</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="color"
                value={
                  state.backgroundColor.length === 7
                    ? state.backgroundColor
                    : "#000000"
                }
                onChange={(e) =>
                  handleChange({ backgroundColor: e.target.value })
                }
              />
              <input
                type="text"
                value={state.backgroundColor}
                onChange={(e) =>
                  handleChange({ backgroundColor: e.target.value })
                }
                style={{ ...inputStyle, flex: 1 }}
                placeholder="#ecf2f5"
              />
            </div>
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>textColor (hex)</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="color"
                value={
                  state.textColor.length === 7 ? state.textColor : "#000000"
                }
                onChange={(e) => handleChange({ textColor: e.target.value })}
              />
              <input
                type="text"
                value={state.textColor}
                onChange={(e) => handleChange({ textColor: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="#3b3838"
              />
            </div>
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>accentColor (hex)</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="color"
                value={
                  state.accentColor.length === 7
                    ? state.accentColor
                    : "#000000"
                }
                onChange={(e) => handleChange({ accentColor: e.target.value })}
              />
              <input
                type="text"
                value={state.accentColor}
                onChange={(e) => handleChange({ accentColor: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="#45859c"
              />
            </div>
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>baseShortSide (px)</span>
            <input
              type="number"
              value={state.baseShortSide}
              onChange={(e) =>
                handleChange({
                  baseShortSide: Math.round(Number(e.target.value)),
                })
              }
              style={inputStyle}
              min="1"
              step="1"
            />
            <span style={{ fontSize: "12px", color: "#666" }}>
              フォントサイズのスケーリング基準短辺（デフォルト: 630）
            </span>
          </label>

          {validationError && (
            <p style={{ color: "red", fontSize: "13px", margin: "0" }}>
              {validationError}
            </p>
          )}

          <button
            onClick={handleSnippetCopy}
            style={{
              padding: "10px 16px",
              backgroundColor: snippetCopied ? "#22c55e" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {snippetCopied ? "コピーしました！" : "スニペットをコピー"}
          </button>
          <p style={{ fontSize: "12px", color: "#666", margin: "0" }}>
            lib/config.ts と lib/template.tsx への変更スクリプトをコピーします（手動で貼り付けてください）。
          </p>
        </div>

        {/* OGP 画像プレビュー */}
        <div>
          {previewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="OGP プレビュー"
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  maxWidth: "100%",
                  display: "block",
                }}
              />
              <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                /api/preview-og を使用しています
              </p>
            </>
          ) : (
            <div
              style={{
                padding: "24px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                color: "#666",
              }}
            >
              バリデーションエラーのため画像を表示できません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
