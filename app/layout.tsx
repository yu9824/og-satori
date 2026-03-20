/**
 * ルートレイアウト
 *
 * このアプリは /api/og エンドポイントのみを提供する。
 * フロントエンドページは不要だが、Next.js App Router のルートレイアウトは必須。
 */

export const metadata = {
  title: "og-satori",
  description: "OGP Image Generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
