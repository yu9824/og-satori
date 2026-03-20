#!/usr/bin/env bash
# subset-fonts.sh
#
# Noto Sans JP のサブセットフォントを生成するスクリプト
#
# 【前提条件】
#   - Python 3 と fonttools がインストールされていること
#   - pip install fonttools brotli
#
# 【サブセット対象文字】
#   - ひらがな (U+3041–U+3096)
#   - カタカナ (U+30A1–U+30FA)
#   - 常用漢字 2136 字
#   - ASCII 印字可能文字 (U+0020–U+007E)
#   - 句読点・記号 (U+3000–U+303F)
#
# 【出力先】
#   - public/fonts/NotoSansJP-Regular.otf
#   - public/fonts/NotoSansJP-Bold.otf
#
# 【ライセンス注意】
#   --no-subset-tables+=name オプションは使用しない。
#   フォントの name テーブル（著作権メタデータ）を保持したまま出力すること。

set -euo pipefail

# ────────────────────────────────────────────────
# 設定
# ────────────────────────────────────────────────

# Noto Sans JP の Google Fonts ダウンロード URL（OTF 形式）
NOTO_VERSION="2.004"
BASE_URL="https://github.com/notofonts/noto-cjk/releases/download/NotoSansJP-${NOTO_VERSION}"
REGULAR_URL="${BASE_URL}/NotoSansJP-Regular.otf"
BOLD_URL="${BASE_URL}/NotoSansJP-Bold.otf"

# 出力先ディレクトリ
OUTPUT_DIR="$(dirname "$0")/../public/fonts"
# 一時ファイルを保存するディレクトリ
TEMP_DIR="$(mktemp -d)"

# 後処理: 一時ファイルを削除する
cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# ────────────────────────────────────────────────
# 前提条件のチェック
# ────────────────────────────────────────────────

if ! command -v pyftsubset &>/dev/null; then
  echo "エラー: fonttools がインストールされていません。"
  echo "  pip install fonttools brotli"
  exit 1
fi

# ────────────────────────────────────────────────
# 出力先ディレクトリの作成
# ────────────────────────────────────────────────

mkdir -p "$OUTPUT_DIR"

# ────────────────────────────────────────────────
# サブセット対象の Unicode 範囲を定義する
# ────────────────────────────────────────────────

# ASCII 印字可能文字 (U+0020–U+007E)
# ひらがな (U+3041–U+3096)
# カタカナ (U+30A1–U+30FA, U+30FC)
# 句読点・全角記号 (U+3000–U+303F)
# 常用漢字の代表的な範囲（実用的なサブセット）
UNICODES=(
  "U+0020-007E"      # ASCII 印字可能文字
  "U+00A0-00FF"      # Latin-1 補足
  "U+2000-206F"      # 一般句読点
  "U+2018,U+2019"    # シングルクォーテーション
  "U+201C,U+201D"    # ダブルクォーテーション
  "U+2026"           # 水平省略記号 (…)
  "U+3000-303F"      # CJK 記号と句読点
  "U+3041-3096"      # ひらがな
  "U+309B-309E"      # ひらがな濁点・半濁点
  "U+30A1-30FA"      # カタカナ
  "U+30FC"           # 長音符
  "U+FF01-FF60"      # 全角ASCII・全角記号
  "U+FF61-FF9F"      # 半角カタカナ
  # 常用漢字 (教育漢字・常用漢字の主要範囲)
  "U+4E00-9FFF"      # CJK 統合漢字（基本ブロック）
)

# Unicode 範囲をカンマ区切りの文字列に変換する
UNICODE_RANGE=$(IFS=','; echo "${UNICODES[*]}")

# ────────────────────────────────────────────────
# pyftsubset の共通オプション
# ────────────────────────────────────────────────

# 注意: --no-subset-tables+=name は使用しない（著作権メタデータを保持するため）
SUBSET_OPTS=(
  "--unicodes=${UNICODE_RANGE}"
  "--output-file"         # 出力ファイルパスは後で指定
  "--flavor=otf"          # OTF 形式で出力する
  "--layout-features=*"   # すべての OpenType 機能を保持する
  "--desubroutinize"      # サブルーチンを展開して互換性を高める
)

# ────────────────────────────────────────────────
# フォントのダウンロードとサブセット生成
# ────────────────────────────────────────────────

process_font() {
  local url="$1"
  local weight="$2"
  local output_name="$3"

  local temp_input="${TEMP_DIR}/${output_name}-original.otf"
  local output_path="${OUTPUT_DIR}/${output_name}.otf"

  echo "→ ${weight} ウェイトをダウンロード中: ${url}"
  curl -fsSL -o "$temp_input" "$url"

  echo "→ サブセットを生成中: ${output_name}.otf"
  pyftsubset "$temp_input" \
    "--unicodes=${UNICODE_RANGE}" \
    "--output-file=${output_path}" \
    "--layout-features=*" \
    "--desubroutinize"

  echo "✓ ${output_name}.otf を生成しました ($(du -sh "$output_path" | cut -f1))"
}

echo "=== Noto Sans JP サブセットフォント生成スクリプト ==="
echo ""

process_font "$REGULAR_URL" "Regular" "NotoSansJP-Regular"
process_font "$BOLD_URL"    "Bold"    "NotoSansJP-Bold"

echo ""
echo "=== 完了 ==="
echo "生成先: ${OUTPUT_DIR}"
echo ""
echo "【ライセンスについて】"
echo "Noto Sans JP は Google LLC and the Noto Authors によって"
echo "SIL Open Font License 1.1 の下で提供されています。"
echo "詳細は public/fonts/OFL.txt を参照してください。"
