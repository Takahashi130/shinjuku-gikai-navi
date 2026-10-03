/**
 * 区の資料で確認できた「その日にどの会派だったか」から、会派の所属の期間を作る
 *
 * - 日付順に並べ、同じ会派が続く間を1つの期間にする。
 * - 期間の始まりと終わりは「資料で確認できた最初と最後の日」で、実際の加入・離脱の日ではない。
 *   確認できない間（2つの資料の間）にいつ会派を移ったかは推測しない。
 */

export type MembershipSource = "plenary_questions" | "faction_page";

export type MembershipObservation = {
  factionId: string;
  /** YYYY-MM-DD */
  date: string;
  source: MembershipSource;
};

export type MembershipPeriod = {
  factionId: string;
  firstSeenOn: string;
  lastSeenOn: string;
  /** 今の会派構成ページで確認できた期間か */
  isCurrent: boolean;
  observationCount: number;
  sources: MembershipSource[];
};

export function buildMembershipPeriods(observations: MembershipObservation[]): MembershipPeriod[] {
  // 同じ日の資料は会派構成ページ（今の所属）を後にする
  const sorted = [...observations].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.source === "faction_page" ? 1 : 0) - (b.source === "faction_page" ? 1 : 0)
  );
  const periods: MembershipPeriod[] = [];
  for (const o of sorted) {
    const last = periods[periods.length - 1];
    if (last && last.factionId === o.factionId) {
      last.lastSeenOn = o.date;
      last.observationCount++;
      if (!last.sources.includes(o.source)) last.sources.push(o.source);
      if (o.source === "faction_page") last.isCurrent = true;
      continue;
    }
    periods.push({
      factionId: o.factionId,
      firstSeenOn: o.date,
      lastSeenOn: o.date,
      isCurrent: o.source === "faction_page",
      observationCount: 1,
      sources: [o.source],
    });
  }
  return periods;
}
