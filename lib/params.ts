/**
 * ParamParser: URLクエリパラメータを解析・バリデーションするモジュール
 *
 * 純粋関数として実装されており、副作用はありません。
 * AppConfig には依存せず、ParamDefaults のみを受け取ります。
 */

/** 解析・検証済みのパラメータ */
export interface OgParams {
  /** 画像に表示するタイトルテキスト。デフォルト: '' */
  title: string;
  /** 画像の幅（px）。デフォルト: defaults.width */
  width: number;
  /** 画像の高さ（px）。デフォルト: defaults.height */
  height: number;
  /** テキスト描画エリアの幅（px）。デフォルト: width * defaults.textWidthRatio */
  textWidth: number;
  /** 画像フォーマット。デフォルト: 'png' */
  format: "png" | "svg";
}

/** バリデーションエラー情報 */
export interface ValidationError {
  /** エラーコード */
  code: "INVALID_FORMAT" | "INVALID_DIMENSION" | "TITLE_TOO_LONG";
  /** 人間が読めるエラーメッセージ */
  message: string;
  /** エラーが発生したフィールド名 */
  field: string;
}

/** クエリパラメータの解析結果 */
export type ParseResult =
  | { ok: true; data: OgParams }
  | { ok: false; error: ValidationError };

/**
 * parseParams に渡すデフォルト値。
 * AppConfig から抽出した数値のみで、ドメイン層が AppConfig（インフラ層）に依存しないようにする。
 */
export interface ParamDefaults {
  /** デフォルト画像幅（px）*/
  width: number;
  /** デフォルト画像高さ（px）*/
  height: number;
  /** デフォルトテキスト幅の比率（0〜1）*/
  textWidthRatio: number;
}

/** タイトルの最大文字数 */
const TITLE_MAX_LENGTH = 200;

/**
 * 正の整数かどうかを検証するヘルパー関数
 * @param value - 検証する数値
 * @returns 正の整数であれば true
 */
function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * URLSearchParams を OgParams または ValidationError に変換する純粋関数
 *
 * バリデーションは fail-fast 方式で、最初のエラーのみ返す。
 * 仕様に定義されていないパラメータは無視して処理を続行する。
 *
 * @param searchParams - 解析対象の URLSearchParams
 * @param defaults - デフォルト値（AppConfig から抽出して渡す）
 * @returns 解析成功時は ok: true と OgParams、失敗時は ok: false と ValidationError
 */
export function parseParams(
  searchParams: URLSearchParams,
  defaults: ParamDefaults
): ParseResult {
  // --- title の解析 ---
  // title が省略または空文字の場合はデフォルトで空文字を返す
  const rawTitle = searchParams.get("title") ?? "";
  // URL デコードは URLSearchParams が自動的に行うため、そのまま使用する
  const title = rawTitle;

  // title が 200 文字を超える場合はエラーを返す
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: {
        code: "TITLE_TOO_LONG",
        message: `title は ${TITLE_MAX_LENGTH} 文字以内で指定してください（現在: ${title.length} 文字）`,
        field: "title",
      },
    };
  }

  // --- width の解析 ---
  const rawWidth = searchParams.get("width");
  let width: number;
  if (rawWidth === null || rawWidth === "") {
    // 省略時はデフォルト値を使用する
    width = defaults.width;
  } else {
    width = Number(rawWidth);
    if (!isPositiveInteger(width)) {
      return {
        ok: false,
        error: {
          code: "INVALID_DIMENSION",
          message: `width は正の整数で指定してください（受け取った値: "${rawWidth}"）`,
          field: "width",
        },
      };
    }
  }

  // --- height の解析 ---
  const rawHeight = searchParams.get("height");
  let height: number;
  if (rawHeight === null || rawHeight === "") {
    // 省略時はデフォルト値を使用する
    height = defaults.height;
  } else {
    height = Number(rawHeight);
    if (!isPositiveInteger(height)) {
      return {
        ok: false,
        error: {
          code: "INVALID_DIMENSION",
          message: `height は正の整数で指定してください（受け取った値: "${rawHeight}"）`,
          field: "height",
        },
      };
    }
  }

  // --- textWidth の解析 ---
  const rawTextWidth = searchParams.get("textWidth");
  let textWidth: number;
  if (rawTextWidth === null || rawTextWidth === "") {
    // 省略時は width * textWidthRatio をデフォルト値として使用する
    textWidth = Math.floor(width * defaults.textWidthRatio);
  } else {
    textWidth = Number(rawTextWidth);
    if (!isPositiveInteger(textWidth)) {
      return {
        ok: false,
        error: {
          code: "INVALID_DIMENSION",
          message: `textWidth は正の整数で指定してください（受け取った値: "${rawTextWidth}"）`,
          field: "textWidth",
        },
      };
    }
  }

  // --- format の解析 ---
  const rawFormat = searchParams.get("format");
  let format: "png" | "svg";
  if (rawFormat === null || rawFormat === "") {
    // 省略時はデフォルトの PNG を使用する
    format = "png";
  } else if (rawFormat === "png" || rawFormat === "svg") {
    format = rawFormat;
  } else {
    // png/svg 以外の値はエラーを返す
    return {
      ok: false,
      error: {
        code: "INVALID_FORMAT",
        message: `format は "png" または "svg" で指定してください（受け取った値: "${rawFormat}"）`,
        field: "format",
      },
    };
  }

  // 全てのバリデーションを通過した場合は OgParams を返す
  // 仕様に定義されていないパラメータ（pattern, fontSize 等）は無視される
  return {
    ok: true,
    data: { title, width, height, textWidth, format },
  };
}
