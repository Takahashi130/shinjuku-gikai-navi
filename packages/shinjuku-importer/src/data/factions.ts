/**
 * 令和以降の新宿区議会の会派と、名前の履歴
 *
 * 区の資料（審議結果 PDF の凡例・質問者一覧・政務活動費収支一覧・会派構成ページ）には
 * その時点の会派名が書かれている。名前が変わった会派を同じ会派として扱えるよう、
 * 区の資料で「会派名を変更」と確認できたものだけをここにまとめる。
 * ここに無い名前は、同じ会派かどうか推測せず、取り込み時に警告を出して会派を空のままにする
 * （今の会派構成ページに載っている会派だけは、新しい会派として自動で作る）。
 */
import { factionNameKey } from "../normalize-member-name";

export type KnownFactionName = {
  name: string;
  validFrom?: string;
  validTo?: string;
  note?: string;
};

export type KnownFaction = {
  slug: string;
  /** 最新の正式名称 */
  name: string;
  /** 名前の履歴（最新の名前を含む） */
  names: KnownFactionName[];
  formedOn?: string;
  dissolvedOn?: string;
  note?: string;
};

const EXPENSES = "政務活動費収支一覧の注記";
const FACTION_PAGE = "会派構成ページの注記";

export const KNOWN_FACTIONS: KnownFaction[] = [
  {
    slug: "jimin-sansei",
    name: "自民・参政クラブ",
    names: [
      { name: "自民・参政クラブ", validFrom: "2025-04-10" },
      {
        name: "自由民主党新宿区議会議員団",
        validTo: "2025-04-09",
        note: `令和7年4月10日付で「自民・参政クラブ」に会派名を変更（${EXPENSES}）`,
      },
    ],
  },
  { slug: "komei", name: "新宿区議会公明党", names: [{ name: "新宿区議会公明党" }] },
  { slug: "kyosan", name: "日本共産党新宿区議会議員団", names: [{ name: "日本共産党新宿区議会議員団" }] },
  { slug: "shinjuku-mirai", name: "新宿未来の会", names: [{ name: "新宿未来の会" }] },
  { slug: "rikken-mushozoku", name: "立憲民主党・無所属クラブ", names: [{ name: "立憲民主党・無所属クラブ" }] },
  { slug: "ishin", name: "日本維新の会・新宿区議団", names: [{ name: "日本維新の会・新宿区議団" }] },
  {
    slug: "genzei",
    name: "現役世代に優しい新宿・減税の会",
    names: [
      { name: "現役世代に優しい新宿・減税の会", validFrom: "2025-04-01" },
      {
        name: "現役世代に優しい新宿",
        validTo: "2025-03-31",
        note: `令和7年4月1日付で「現役世代に優しい新宿・減税の会」に会派名を変更（${EXPENSES}）`,
      },
    ],
  },
  {
    slug: "inochi",
    name: "いのちの党 新宿",
    names: [
      { name: "いのちの党 新宿", validFrom: "2026-08-07" },
      {
        name: "れいわ新選組 新宿",
        validTo: "2026-08-06",
        note: `令和8年8月7日付で会派名を「れいわ新選組 新宿」から「いのちの党 新宿」に変更（${FACTION_PAGE}）`,
      },
    ],
  },
  {
    slug: "update-shinjuku",
    name: "アップデート新宿",
    names: [{ name: "アップデート新宿" }],
    formedOn: "2026-07-01",
    note: `令和8年7月1日付で結成（${FACTION_PAGE}）`,
  },
  {
    slug: "shamin",
    name: "社民新宿区議会議員団",
    names: [
      { name: "社民新宿区議会議員団", validFrom: "2022-05-10" },
      {
        name: "社民党新宿区議会議員団",
        validTo: "2022-05-09",
        note: `令和4年5月10日付で「社民党新宿区議会議員団」から会派名を変更（${EXPENSES}）`,
      },
    ],
  },
  { slug: "startup-shinjuku", name: "スタートアップ新宿", names: [{ name: "スタートアップ新宿" }] },
  {
    slug: "chiisaki-koe",
    name: "ちいさき声をすくいあげる会",
    names: [{ name: "ちいさき声をすくいあげる会" }],
    dissolvedOn: "2022-05-20",
    note: `令和4年5月20日付で会派消滅（${EXPENSES}）`,
  },
  {
    slug: "kumin-wo-mamoru",
    name: "新宿区民を守る会",
    names: [{ name: "新宿区民を守る会" }],
    dissolvedOn: "2021-04-22",
    note: `令和3年4月22日付で会派消滅（${EXPENSES}）`,
  },
  {
    slug: "sansei-manabi",
    name: "参政党新宿まなびとまもりの会",
    names: [{ name: "参政党新宿まなびとまもりの会" }],
    dissolvedOn: "2025-04-10",
    note: `令和7年4月10日付で会派消滅（${EXPENSES}）`,
  },
  {
    slug: "rikken-forum",
    name: "新宿区議会立憲フォーラム",
    names: [{ name: "新宿区議会立憲フォーラム" }],
    formedOn: "2023-12-11",
    dissolvedOn: "2025-04-01",
    note: `令和5年12月11日付で結成、令和7年4月1日付で会派消滅（${EXPENSES}）`,
  },
];

const BY_KEY = new Map<string, string>(
  KNOWN_FACTIONS.flatMap((f) => f.names.map((n) => [factionNameKey(n.name), f.slug] as const))
);

/** 区の資料に書かれた会派名から、会派一覧のキー（slug）を引く。一覧に無ければ null */
export function findKnownFactionSlug(name: string): string | null {
  return BY_KEY.get(factionNameKey(name)) ?? null;
}
