import { describe, expect, it } from "vitest";
import type { BillStatusEnum } from "../types";
import { buildHomeView } from "./build-home-view";

const budget = { id: "budget", label: "予算・お金" };
const childcare = { id: "childcare", label: "子育て" };
const education = { id: "education", label: "教育" };

function bill(
  id: string,
  day: number,
  overrides: {
    status?: BillStatusEnum;
    tags?: { id: string; label: string }[];
    isFeatured?: boolean;
    submitted?: boolean;
  } = {}
) {
  return {
    id,
    status: overrides.status ?? "enacted",
    submitted_date:
      overrides.submitted === false
        ? null
        : new Date(Date.UTC(2026, 0, day)).toISOString(),
    updated_at: "2026-06-01T00:00:00Z",
    tags: overrides.tags ?? [],
    is_featured: overrides.isFeatured ?? false,
  };
}

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("buildHomeView", () => {
  it("テーマ別のカードはテーマの順に、新しい議案から最大4件を載せる", () => {
    const bills = [
      bill("b1", 1, { tags: [budget] }),
      bill("b2", 2, { tags: [budget] }),
      bill("b3", 3, { tags: [budget] }),
      bill("b4", 4, { tags: [budget] }),
      bill("b5", 5, { tags: [budget, childcare] }),
      bill("c1", 6, { tags: [childcare] }),
    ];

    const view = buildHomeView(bills, [budget, childcare]);

    expect(view.themeShelves).toEqual([
      {
        theme: budget,
        count: 5,
        bills: [bills[4], bills[3], bills[2], bills[1]],
      },
      { theme: childcare, count: 2, bills: [bills[5], bills[4]] },
    ]);
  });

  // 選んでも何も出ないカードを並べる意味がない。
  it("議案の無いテーマのカードは出さない", () => {
    const view = buildHomeView(
      [bill("b1", 1, { tags: [budget] })],
      [education, budget]
    );

    expect(view.themeShelves.map((shelf) => shelf.theme.id)).toEqual([
      "budget",
    ]);
  });

  it("列はステータスと賛否の分かれ方で分け、新しい順に並べる", () => {
    const bills = [
      bill("enacted-old", 1, { status: "enacted" }),
      bill("enacted-new", 9, { status: "enacted", isFeatured: true }),
      bill("rejected", 5, { status: "rejected", isFeatured: true }),
      bill("deliberating", 7, { status: "in_originating_house" }),
      bill("introduced", 8, { status: "introduced" }),
    ];

    const { rows } = buildHomeView(bills, []);

    expect(ids(rows.deliberating)).toEqual(["introduced", "deliberating"]);
    expect(ids(rows.enacted)).toEqual(["enacted-new", "enacted-old"]);
    expect(ids(rows.rejected)).toEqual(["rejected"]);
    expect(ids(rows.split)).toEqual(["enacted-new", "rejected"]);
  });

  it("提出日の無い議案は列の最後に回す", () => {
    const bills = [bill("no-date", 0, { submitted: false }), bill("dated", 1)];

    expect(ids(buildHomeView(bills, []).rows.enacted)).toEqual([
      "dated",
      "no-date",
    ]);
  });

  it("列とカードの件数の上限を指定できる", () => {
    const bills = Array.from({ length: 6 }, (_, i) =>
      bill(`b${i}`, i + 1, { tags: [budget] })
    );

    const view = buildHomeView(bills, [budget], {
      shelfSize: 2,
      rowLimit: 3,
    });

    expect(ids(view.themeShelves[0].bills)).toEqual(["b5", "b4"]);
    expect(view.themeShelves[0].count).toBe(6);
    expect(ids(view.rows.enacted)).toEqual(["b5", "b4", "b3"]);
  });

  it("件数は上限で切る前の全体から数える", () => {
    const bills = [
      bill("a", 1, { status: "enacted", isFeatured: true }),
      bill("b", 2, { status: "rejected", isFeatured: true }),
      bill("c", 3, { status: "in_originating_house" }),
    ];

    const view = buildHomeView(bills, [], { rowLimit: 1 });

    expect(view.statusCounts).toMatchObject({
      all: 3,
      enacted: 1,
      rejected: 1,
      deliberating: 1,
    });
    expect(view.splitCount).toBe(2);
  });

  it("元の配列を並べ替えない", () => {
    const bills = [bill("old", 1), bill("new", 2)];
    buildHomeView(bills, []);
    expect(ids(bills)).toEqual(["old", "new"]);
  });
});
