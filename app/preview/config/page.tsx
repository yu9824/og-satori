/**
 * ConfigPreviewPage: デザイントークン設定プレビューページ（Server Component）
 *
 * ローカル開発専用ページ。production 環境（NODE_ENV=production）では 404 を返す。
 * loadConfig() でデフォルト設定を取得し ConfigPreviewClient に渡す。
 */
import { notFound } from "next/navigation";
import { loadConfig } from "@/lib/config";
import { ConfigPreviewClient } from "./ConfigPreviewClient";

export default function ConfigPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const config = loadConfig();
  const width = config.defaultWidth;
  const height = config.defaultHeight;

  const initialConfig = {
    title: "",
    width,
    height,
    textWidth: Math.floor(width * config.defaultTextWidthRatio),
    siteName: config.siteName,
    defaultTextWidthRatio: config.defaultTextWidthRatio,
    backgroundColor: "#ecf2f5",
    textColor: "#3b3838",
    accentColor: "#45859c",
    baseShortSide: 630,
  };

  return <ConfigPreviewClient initialConfig={initialConfig} />;
}
