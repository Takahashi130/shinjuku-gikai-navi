import type { BillKind } from "./parse-session-page";

export type Theme = { slug: string; label: string };

/**
 * 議案のテーマ。トップページのテーマ別一覧（タグ）と仮のサムネイル画像に使う。
 * 画像は web/public/img/thumbnails/{slug}.png に置いている。
 * 並び順がトップページでの表示順になる。
 */
export const THEMES = {
  budget: { slug: "budget", label: "予算・お金" },
  childcare: { slug: "childcare", label: "子育て" },
  education: { slug: "education", label: "教育" },
  welfare: { slug: "welfare", label: "福祉・健康" },
  safety: { slug: "safety", label: "防災・安全" },
  environment: { slug: "environment", label: "環境・公園" },
  town: { slug: "town", label: "まちづくり" },
  construction: { slug: "construction", label: "工事・契約" },
  ordinance: { slug: "ordinance", label: "区のルール" },
  opinion: { slug: "opinion", label: "意見書・決議" },
} as const satisfies Record<string, Theme>;

/** 上から順に判定し、最初に当てはまったテーマを使う */
const RULES: { theme: Theme; pattern: RegExp }[] = [
  { theme: THEMES.budget, pattern: /予算|補正|決算/ },
  { theme: THEMES.construction, pattern: /工事|請負契約|委託契約|買入れ|取得について|指定管理者/ },
  { theme: THEMES.childcare, pattern: /保育|子ども|児童|子育て|幼稚園|母乳|出産/ },
  { theme: THEMES.education, pattern: /学校|教育|学用品|修学旅行|図書館|学童/ },
  { theme: THEMES.welfare, pattern: /福祉|介護|保健|医療|健康|国民健康保険|生活保護|障害|高齢|後期高齢者/ },
  { theme: THEMES.safety, pattern: /災害|防災|消防|安全|防犯|損害補償|危機/ },
  { theme: THEMES.environment, pattern: /公園|みどり|緑|環境|ごみ|清掃|リサイクル|空き缶|喫煙|自転車/ },
  { theme: THEMES.town, pattern: /地区計画|建築|まちづくり|住宅|道路|区民ホール|施設|住居表示|都市計画/ },
];

export function pickTheme(name: string, kind: BillKind): Theme {
  if (kind === "member" && /意見書|決議/.test(name)) return THEMES.opinion;
  return RULES.find((r) => r.pattern.test(name))?.theme ?? THEMES.ordinance;
}

export function pickThumbnail(name: string, kind: BillKind): string {
  return `/img/thumbnails/${pickTheme(name, kind).slug}.png`;
}
