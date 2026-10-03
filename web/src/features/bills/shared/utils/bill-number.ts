import { parseBillVotes } from "./parse-bill-votes";

/** 議案番号らしさの目印（「第42号議案」「認定第3号」「議員提出議案第1号」など）。 */
const BILL_NUMBER_PATTERN = /第[0-9０-９]+号/;

/**
 * 議案の解説（Markdown）から議案番号を読み取る。
 *
 * 新宿区議会の取り込み（packages/shinjuku-importer）は、議決済みの議案には
 * `**可決**（第42号議案）`、審議中の議案には `審議中です（第64号議案）。` の形で
 * 番号を書く。この2か所だけを見る（概要の本文には「補正予算（第2号）」の
 * ような別の番号が出てくるので、文中から探さない）。
 *
 * 読めなければ null（画面には出さない）。
 */
export function extractBillNumber(
  markdown: string | null | undefined
): string | null {
  if (!markdown) return null;

  const resultNote = parseBillVotes(markdown)?.resultNote;
  if (resultNote && BILL_NUMBER_PATTERN.test(resultNote)) {
    return resultNote;
  }

  const deliberating = /審議中です[（(]([^）)]+)[）)]/.exec(markdown)?.[1];
  if (deliberating && BILL_NUMBER_PATTERN.test(deliberating)) {
    return deliberating.trim();
  }

  return null;
}
