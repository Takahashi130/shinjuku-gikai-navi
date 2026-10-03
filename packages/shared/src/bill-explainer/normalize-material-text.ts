/**
 * 区の資料（PDF から抜き出した文字）を、読みやすく・照合しやすい形にそろえる。
 *
 * PDF から抜き出した文字には次のような揺れがある。
 * - 全角・半角（「１２」「12」、「ＥＳＣＯ」「ESCO」、「⑴」「(1)」）
 * - 1文字ずつ空白が入る行（「第 ６ ７ 号 議 案」）
 * - 日本語の間の空白（「令和 8 年 12 月 1 日」）
 * - 行の途中での改行（照合ではすべての空白・改行を無視する）
 */

const CJK =
  "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\u3000-\\u303F\\uFF01-\\uFF60・ー";
const SPACE_NEXT_TO_CJK = new RegExp(
  `(?<=[${CJK}])[ \\t]+|[ \\t]+(?=[${CJK}])`,
  "gu"
);

/** 1文字ずつ空白が入っている行か（「第 ６ ７ 号 議 案」など） */
function isLetterSpaced(tokens: string[]): boolean {
  if (tokens.length < 4) return false;
  const singles = tokens.filter((t) => [...t].length === 1).length;
  return singles / tokens.length >= 0.7;
}

function normalizeLine(line: string): string {
  const trimmed = line.replace(/[ \t ]+/g, " ").trim();
  if (!trimmed) return "";
  const tokens = trimmed.split(" ");
  const joined = isLetterSpaced(tokens) ? tokens.join("") : trimmed;
  return joined.replace(SPACE_NEXT_TO_CJK, "");
}

/** 表示・保存用：全角半角をそろえ、余分な空白を除く（改行は残す） */
export function normalizeMaterialText(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[〜～]/g, "~")
    .replace(/[‐‑‒–—―−]/g, "-")
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean)
    .join("\n");
}

/** 照合用：normalizeMaterialText に加えて、空白と改行をすべて除く */
export function compactForMatch(text: string): string {
  return normalizeMaterialText(text).replace(/\s+/g, "");
}

/** 抜き出した文（quote）が資料（material）にそのまま含まれているか */
export function containsQuote(material: string, quote: string): boolean {
  const q = compactForMatch(quote);
  if (!q) return false;
  return compactForMatch(material).includes(q);
}
