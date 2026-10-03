import { describe, expect, it } from "vitest";
import { extractExpenseReportLinks, parseExpensePdf, parseExpensePeriod } from "./parse-expense-pdf";
import type { TextItem } from "./parse-results-pdf";

const t = (str: string, x: number, y: number, width = 10, height = 8): TextItem => ({ str, x, y, width, height });

/** 金額の列（収入、9つの費目、支出合計）の x 座標 */
const MONEY_XS = [281, 321, 359, 386, 438, 479, 515, 535, 567, 597, 646];
const money = (y: number, values: string[]) => values.map((v, k) => t(v, MONEY_XS[k], y));

// 区の「政務活動費収支一覧」（令和5年度 20期）の形をまねた文字の並び。
// 人数や注記の番号（※1）が行の少し上下にずれて描かれる年度があるため、それも再現する。
const items: TextItem[] = [
  t("令和５年度", 170, 539),
  t("政務活動費の各会派収支状況", 219, 539),
  t("２０期〔令和５年５月～令和６年３月分〕", 170, 522),
  t("会派名", 202, 499),
  t("人 数", 256, 499),
  t("収", 282, 499),
  t("入", 293, 499),
  t("支出合計", 636, 499),
  t("要請・", 459, 495),
  ...["調査研究費", "研修費", "広報費", "広聴費"].map((s, k) => t(s, [311, 352, 388, 422][k], 492)),
  ...["会議費", "資料費", "人件費", "事務費"].map((s, k) => t(s, [493, 528, 563, 599][k], 492)),
  t("陳情活動費", 452, 489),
  // 1行目：同じ高さに人数がある
  t("新 宿 未 来 の 会", 169, 473),
  t("６", 262, 473),
  ...money(473, ["9,900,000", "0", "0", "7,318,551", "0", "0", "0", "930", "0", "852,006", "8,171,487"]),
  // 2行目：人数が少し上、注記の番号が少し下にずれている
  t("３", 262, 400),
  t("立 憲 民 主 党 ・ 無 所 属 ク ラ ブ", 169, 397),
  ...money(397, ["6,150,000", "167,305", "60,800", "4,066,177", "550", "0", "0", "96,719", "748,000", "1,007,478", "6,147,029"]),
  t("（※１）", 257, 394),
  // 3行目：注記の番号（4）が人数（1）の左に別の文字として描かれている
  t("新宿区民を守る会", 169, 340),
  t("※", 230, 340),
  t("4", 240, 340),
  t("1", 262, 340),
  ...money(340, ["150,000", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]),
  t("合", 208, 284),
  t("計", 226, 284),
  ...money(284, ["16,200,000", "167,305", "60,800", "11,384,728", "550", "0", "0", "97,649", "748,000", "1,859,484", "14,318,516"]),
  t("〇収入･･･区が会派に対して交付した金額です。", 169, 261),
  t("※1 令和5年12月11日付", 169, 245),
  t("会派人数が４名から３名に変更されました。", 248, 245),
  t("※4「新宿区民を守る会」は、令和3年4月22日付で会派消滅しました。", 169, 237),
];

describe("parseExpensePdf", () => {
  const report = parseExpensePdf([items]);

  it("年度と対象期間を読む", () => {
    expect(report).toMatchObject({
      fiscalYear: 2023,
      periodLabel: "20期 令和5年5月～令和6年3月分",
      periodStart: "2023-05-01",
      periodEnd: "2024-03-31",
    });
  });

  it("会派ごとの人数・収入・費目・支出合計を読む（ずれて描かれた人数も行に対応づける）", () => {
    expect(report.rows.map((r) => [r.factionName, r.memberCount, r.income, r.totalExpense])).toEqual([
      ["新宿未来の会", 6, 9_900_000, 8_171_487],
      ["立憲民主党・無所属クラブ", 3, 6_150_000, 6_147_029],
      ["新宿区民を守る会", 1, 150_000, 0],
    ]);
    expect(report.rows[1].expenses).toEqual({
      research: 167_305,
      training: 60_800,
      publicity: 4_066_177,
      hearing: 550,
      petition: 0,
      meeting: 0,
      materials: 96_719,
      personnel: 748_000,
      office: 1_007_478,
    });
  });

  it("注記を番号で会派に対応づける", () => {
    expect(report.rows.map((r) => r.notes)).toEqual([
      [],
      ["※1 令和5年12月11日付 会派人数が４名から３名に変更されました。"],
      ["※4「新宿区民を守る会」は、令和3年4月22日付で会派消滅しました。"],
    ]);
    expect(report.notes).toHaveLength(2);
  });

  it("費目の合計が支出合計と合わない行はエラーにする", () => {
    const broken = items.map((i) => (i.str === "8,171,487" ? { ...i, str: "8,171,488" } : i));
    expect(() => parseExpensePdf([broken])).toThrow("一致しません");
  });

  it("会派の行を足した額が表の合計と合わなければエラーにする（行の読み落としを見逃さない）", () => {
    const missingRow = items.filter((i) => i.y !== 340 && i.str !== "※");
    expect(() => parseExpensePdf([missingRow])).toThrow("表の合計");
  });

  it("年度が読めなければエラーにする", () => {
    expect(() => parseExpensePdf([[t("収支状況", 0, 0)]])).toThrow("年度");
  });
});

describe("parseExpensePeriod", () => {
  it("1か月だけの期間（改選前の4月分）を読む", () => {
    expect(parseExpensePeriod("１９期〔令和５年４月分〕")).toEqual({
      label: "19期 令和5年4月分",
      start: "2023-04-01",
      end: "2023-04-30",
    });
  });

  it("年度をまたぐ期間を読む", () => {
    expect(parseExpensePeriod("〔令和７年４月～令和８年３月分〕")).toEqual({
      label: "令和7年4月～令和8年3月分",
      start: "2025-04-01",
      end: "2026-03-31",
    });
  });
});

describe("extractExpenseReportLinks", () => {
  it("収支一覧の PDF だけを取り出し、資料名を整える", () => {
    const html = `
<li><a href="/content/000461737.pdf">令和7年度　政務活動費収支一覧 [PDF形式：78KB] （新規ウィンドウ表示）</a></li>
<li><a href="/content/000403267.pdf">令和5年度　政務活動費収支一覧（令和5年5月から令和6年3月） [PDF形式：105KB]</a></li>
<li><a href="/content/000359152.pdf">新宿区政務活動費の交付に関する条例 [PDF形式：173KB]</a></li>`;
    expect(extractExpenseReportLinks(html, "https://www.city.shinjuku.lg.jp/kusei/file08_00021.html")).toEqual([
      { title: "令和7年度 政務活動費収支一覧", pdfUrl: "https://www.city.shinjuku.lg.jp/content/000461737.pdf" },
      {
        title: "令和5年度 政務活動費収支一覧（令和5年5月から令和6年3月）",
        pdfUrl: "https://www.city.shinjuku.lg.jp/content/000403267.pdf",
      },
    ]);
  });
});
