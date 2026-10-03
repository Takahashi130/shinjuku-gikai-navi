/**
 * 議員名・会派名の表記ゆれをそろえる
 *
 * 区のページでは同じ議員でも「鈴木 ひろみ」「鈴木ひろみ」「鈴木 ひろみ議員」のように
 * 空白や敬称の有無が揺れるため、突き合わせには空白を除いた文字列を使う。
 */

/** 議員名を突き合わせ用のキーにする（全角半角・空白・末尾の「議員」をそろえる） */
export function memberNameKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/議員$/, "");
}

/** 表示用の議員名（前後の空白と末尾の「議員」を除き、空白を1つにする） */
export function cleanMemberName(name: string): string {
  return name
    .replace(/[\s　]+/g, " ")
    .trim()
    .replace(/\s*議員$/, "")
    .trim();
}

/**
 * 会派名を突き合わせ用のキーにする。
 * 全角半角・空白・注記の記号（※、※1、（※1））をそろえる。
 */
export function factionNameKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\(?※\s*\d*\)?/g, "")
    .replace(/\s+/g, "");
}

/**
 * 表示用の会派名。注記の記号を除き、PDF の字間あき（「新 宿 未 来 の 会」）は詰める。
 * 「れいわ新選組 新宿」のような意味のある空白は1つだけ残す。
 */
export function cleanFactionName(name: string): string {
  const tokens = name
    .replace(/[（(]?※\s*[0-9０-９]*[）)]?/g, " ")
    .split(/[\s　]+/)
    .filter(Boolean);
  const letterSpaced = tokens.length > 1 && tokens.every((t) => t.length <= 2);
  return tokens.join(letterSpaced ? "" : " ");
}
