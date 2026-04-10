"use client";

/**
 * PreviewClient: OGP 画像プレビューのクライアントコンポーネント
 *
 * title/width/height/textWidth コントロールを提供し、バリデーション後に /api/og URL を更新する。
 * 画像クリックで /api/og?... URL をクリップボードにコピーする。
 * すべての状態は useState でエフェメラルに管理する（永続化なし）。
 */

import { useState } from "react";
import { parseParams } from "@/lib/params";

interface PreviewState {
  title: string;
  width: number;
  height: number;
  textWidth: number;
  defaultTextWidthRatio: number;
}

interface PreviewClientProps {
  initialConfig: PreviewState;
}

function buildOgUrl(state: PreviewState): string {
  const params = new URLSearchParams({
    title: state.title,
    width: String(state.width),
    height: String(state.height),
    textWidth: String(state.textWidth),
  });
  return `/api/og?${params.toString()}`;
}

export function PreviewClient({ initialConfig }: PreviewClientProps) {
  const [state, setState] = useState<PreviewState>(initialConfig);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(() =>
    buildOgUrl(initialConfig)
  );
  const [copied, setCopied] = useState(false);

  function handleChange(updates: Partial<PreviewState>) {
    const newState = { ...state, ...updates };

    // width または defaultTextWidthRatio 変更時に textWidth を再計算
    if ("width" in updates || "defaultTextWidthRatio" in updates) {
      newState.textWidth = Math.floor(
        newState.width * newState.defaultTextWidthRatio
      );
    }

    setState(newState);

    // バリデーション
    const sp = new URLSearchParams({
      title: newState.title,
      width: String(newState.width),
      height: String(newState.height),
      textWidth: String(newState.textWidth),
    });
    const result = parseParams(sp, {
      width: newState.width,
      height: newState.height,
      textWidthRatio: newState.defaultTextWidthRatio,
    });

    if (result.ok) {
      setValidationError(null);
      setPreviewUrl(buildOgUrl(newState));
    } else {
      setValidationError(result.error.message);
    }
  }

  async function handleImageClick() {
    const url = new URL(previewUrl, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "sans-serif",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>OGP プレビュー</h1>

      <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
        {/* コントロールパネル */}
        <div
          style={{
            minWidth: "280px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>title</span>
            <input
              type="text"
              value={state.title}
              onChange={(e) => handleChange({ title: e.target.value })}
              style={{
                padding: "6px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              placeholder="記事タイトルを入力"
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>width (px)</span>
            <input
              type="number"
              value={state.width}
              onChange={(e) => handleChange({ width: Number(e.target.value) })}
              style={{
                padding: "6px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              min="1"
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>height (px)</span>
            <input
              type="number"
              value={state.height}
              onChange={(e) => handleChange({ height: Number(e.target.value) })}
              style={{
                padding: "6px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              min="1"
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontWeight: "bold" }}>textWidth (px)</span>
            <input
              type="number"
              value={state.textWidth}
              onChange={(e) =>
                handleChange({ textWidth: Number(e.target.value) })
              }
              style={{
                padding: "6px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              min="1"
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
              style={{
                padding: "6px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              min="0.01"
              max="1"
              step="0.01"
            />
          </label>

          {validationError && (
            <p style={{ color: "red", fontSize: "13px", margin: "0" }}>
              {validationError}
            </p>
          )}

          <p style={{ fontSize: "12px", color: "#666", margin: "0" }}>
            画像をクリックすると /api/og URL をコピーします
          </p>
          {copied && (
            <p style={{ color: "green", fontSize: "13px", margin: "0" }}>
              URL をコピーしました！
            </p>
          )}

          <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
            色・サイト名の設定は{" "}
            <a href="/preview/config" style={{ color: "#0070f3" }}>
              /preview/config
            </a>{" "}
            で変更できます（ローカル開発専用）。
          </p>
        </div>

        {/* OGP 画像プレビュー */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="OGP プレビュー"
            onClick={handleImageClick}
            style={{
              cursor: "pointer",
              border: "1px solid #ddd",
              borderRadius: "4px",
              maxWidth: "100%",
              display: "block",
            }}
          />
          <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
            クリックで URL をコピー
          </p>
        </div>
      </div>
    </div>
  );
}
