/**
 * 議員の数字（本会議の質問の回数など）を数える期間の書き方。
 *
 * 一覧のカードとページ上部のタイルは、全員同じ期間（今の任期の始まりから）で
 * 数え、その期間を必ず書く。前の任期から議員の人ほど数が多く見えないように
 * するため（令和元年からの合計は議員のページの節にだけ出す）。
 */

/** 「2023年5月〜」。任期の始まりが分からなければ null */
function formatTermStartMonth(termStart: string | null): string | null {
  const match = termStart?.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}年${Number(match[2])}月〜`;
}

/** 「今の任期（2023年5月〜）」。任期の始まりが分からなければ null */
export function formatCurrentTermSince(
  termStart: string | null
): string | null {
  const month = formatTermStartMonth(termStart);
  return month ? `今の任期（${month}）` : null;
}

/**
 * 一覧のカードの狭い枠に出す短い書き方「2023年5月〜（今の任期）」。
 * 任期の始まりが分からなければ null
 */
export function formatCurrentTermSinceShort(
  termStart: string | null
): string | null {
  const month = formatTermStartMonth(termStart);
  return month ? `${month}（今の任期）` : null;
}

/** 議長・副議長の役職か（区の議長・副議長のページの役職名） */
export function isPresidingOfficerRole(role: string): boolean {
  return role === "議長" || role === "副議長";
}

/**
 * 議長・副議長の質問の回数に添える注記。議長は本会議の議事を整理する立場
 * （地方自治法第104条）で、副議長はその代わりを務める。新宿区議会の今の議長・
 * 副議長も、就任のあとは本会議で質問していない（区の質問者一覧で確認）。
 */
export const PRESIDING_OFFICER_QUESTION_NOTE =
  "議長・副議長は本会議の議事を整理する立場のため、在任中は本会議で質問していないことがあります。";

/** 期数（区の名簿の「当選期数」の書き方。例：3期） */
export function formatElectedTerms(electedCount: number): string {
  return `${electedCount}期`;
}
