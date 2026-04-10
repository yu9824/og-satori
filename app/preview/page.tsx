/**
 * PreviewPage: OGP 画像プレビューページ（Server Component）
 *
 * production 環境でも動作する（ガードなし）。
 * loadConfig() でデフォルト設定を取得し、URL searchParams で上書き可能。
 * 型変換のみ行い、バリデーションは PreviewClient に委ねる。
 */
import { loadConfig } from "@/lib/config";
import { PreviewClient } from "./PreviewClient";

type SearchParams = Promise<{
  title?: string;
  width?: string;
  height?: string;
  textWidth?: string;
}>;

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const config = loadConfig();
  const params = await searchParams;

  const width = params.width ? Number(params.width) : config.defaultWidth;
  const height = params.height ? Number(params.height) : config.defaultHeight;

  const initialConfig = {
    title: params.title ?? "",
    width,
    height,
    textWidth: params.textWidth
      ? Number(params.textWidth)
      : Math.floor(width * config.defaultTextWidthRatio),
    defaultTextWidthRatio: config.defaultTextWidthRatio,
  };

  return <PreviewClient initialConfig={initialConfig} />;
}
