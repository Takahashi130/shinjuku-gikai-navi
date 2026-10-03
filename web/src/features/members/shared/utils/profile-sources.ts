/**
 * 議員のページの出典（区の HTML ページ）。PDF には直接リンクしない
 * （区が PDF への直接リンクを控えるよう求めているため。取り込み処理も
 * PDF を載せている HTML ページの URL を保存している）。
 */

export type ProfileSource = { label: string; url: string };

const POSITION_SOURCE_LABELS: Record<string, string> = {
  council: "議長・副議長",
  standing_committee: "委員会の委員名簿",
  steering_committee: "委員会の委員名簿",
  special_committee: "委員会の委員名簿",
  faction: "会派構成",
};

/** 出典の一覧を作る。同じ URL は最初のものだけ残す。 */
export function buildProfileSources({
  memberSourceUrl,
  factionSourceUrl,
  positions,
  expenses,
}: {
  memberSourceUrl: string;
  factionSourceUrl: string | null;
  positions: readonly { body_kind: string; source_url: string }[];
  expenses: readonly { source_url: string }[];
}): ProfileSource[] {
  const candidates: ProfileSource[] = [
    { label: "議員名簿", url: memberSourceUrl },
    ...(factionSourceUrl ? [{ label: "会派構成", url: factionSourceUrl }] : []),
    ...positions.map((p) => ({
      label: POSITION_SOURCE_LABELS[p.body_kind] ?? "役職",
      url: p.source_url,
    })),
    ...expenses.map((e) => ({ label: "政務活動費", url: e.source_url })),
  ];

  const seen = new Set<string>();
  return candidates.filter((source) => {
    if (!source.url || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}
