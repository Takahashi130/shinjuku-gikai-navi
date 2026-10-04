/** 会派名の履歴の1行（faction_names）。valid_from / valid_to が null は「区の資料に書かれていない」 */
export type FactionNameRow = {
  faction_id: string;
  name: string;
  valid_from: string | null;
  valid_to: string | null;
};

/** 所属の履歴に添える、当時の会派名 */
export type FormerFactionName = {
  name: string;
  /** この名前だった最後の日（分からなければ null） */
  validTo: string | null;
};

/**
 * 所属していた期間（from〜to。区の資料で確認できた最初と最後の日）に使われて
 * いた、今の会派名とは違う会派名を古い順に返す。
 *
 * 例：大門さんの「自民・参政クラブ 2019年〜2026年2月」には、2025年4月9日まで
 * の会派名「自由民主党新宿区議会議員団」を添える（今の名前で昔の期間を書くと、
 * 当時からその名前だったように読めるため）。
 */
export function formerFactionNamesDuring(
  names: readonly FactionNameRow[],
  period: { factionId: string; currentName: string; from: string; to: string }
): FormerFactionName[] {
  return names
    .filter(
      (row) =>
        row.faction_id === period.factionId &&
        row.name !== period.currentName &&
        (row.valid_from === null || row.valid_from <= period.to) &&
        (row.valid_to === null || row.valid_to >= period.from)
    )
    .sort((a, b) => (a.valid_to ?? "9999").localeCompare(b.valid_to ?? "9999"))
    .map((row) => ({ name: row.name, validTo: row.valid_to }));
}
