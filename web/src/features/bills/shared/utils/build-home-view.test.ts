import { describe, expect, it } from "vitest";
import type { BillStatusEnum } from "../types";
import { buildHomeView, describeFeaturedSection } from "./build-home-view";

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
    hasPublicInterview?: boolean;
    updatedAt?: string;
    submittedDate?: string | null;
  } = {}
) {
  return {
    id,
    status: overrides.status ?? "enacted",
    submitted_date:
      overrides.submittedDate !== undefined
        ? overrides.submittedDate
        : new Date(Date.UTC(2026, 0, day)).toISOString(),
    updated_at: overrides.updatedAt ?? "2026-06-01T00:00:00Z",
    tags: overrides.tags ?? [],
    is_featured: overrides.isFeatured ?? false,
    hasPublicInterview: overrides.hasPublicInterview ?? false,
  };
}

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("buildHomeView", () => {
  it("件数は全議案から数える", () => {
    const view = buildHomeView(
      [
        bill("a", 1, { status: "in_originating_house" }),
        bill("b", 2, { status: "enacted", isFeatured: true }),
        bill("c", 3, { status: "rejected", isFeatured: true }),
        bill("d", 4, { status: "enacted" }),
      ],
      []
    );

    expect(view.totalCount).toBe(4);
    expect(view.statusCounts.deliberating).toBe(1);
    expect(view.statusCounts.enacted).toBe(2);
    expect(view.statusCounts.rejected).toBe(1);
    expect(view.splitCount).toBe(2);
  });

  it("審議中の議案があれば、新しい順に最大6件を大きめのカードに載せる", () => {
    const bills = Array.from({ length: 8 }, (_, i) =>
      bill(`d${i + 1}`, i + 1, { status: "in_originating_house" })
    );

    const view = buildHomeView([...bills, bill("e", 20)], []);

    expect(view.featured.kind).toBe("deliberating");
    expect(ids(view.featured.bills)).toEqual([
      "d8",
      "d7",
      "d6",
      "d5",
      "d4",
      "d3",
    ]);
  });

  // 閉会中でも、トップに議案が1件も無い状態にしない。
  it("審議中が無ければ、最近議決された議案を載せる", () => {
    const view = buildHomeView(
      [
        bill("old", 1),
        bill("new", 5, { status: "rejected" }),
        bill("prep", 9, { status: "preparing" }),
      ],
      []
    );

    expect(view.featured.kind).toBe("recent");
    expect(ids(view.featured.bills)).toEqual(["new", "old"]);
  });

  it("比較の例の候補は、賛否が分かれて議決まで済んだ議案を新しい順に", () => {
    const view = buildHomeView(
      [
        bill("split-old", 1, { isFeatured: true }),
        bill("split-new", 9, { isFeatured: true, status: "rejected" }),
        bill("split-deliberating", 10, {
          isFeatured: true,
          status: "in_originating_house",
        }),
        bill("unanimous", 11),
      ],
      []
    );

    expect(ids(view.comparisonCandidates)).toEqual(["split-new", "split-old"]);
  });

  it("比較の例の候補は最大3件", () => {
    const bills = Array.from({ length: 5 }, (_, i) =>
      bill(`s${i}`, i + 1, { isFeatured: true })
    );

    expect(buildHomeView(bills, []).comparisonCandidates).toHaveLength(3);
  });

  it("テーマのチップはテーマの順に件数つきで出し、議案の無いテーマは除く", () => {
    const view = buildHomeView(
      [
        bill("a", 1, { tags: [budget] }),
        bill("b", 2, { tags: [budget, childcare] }),
      ],
      [childcare, education, budget]
    );

    expect(view.themeChips).toEqual([
      { ...childcare, count: 1 },
      { ...budget, count: 2 },
    ]);
  });

  it("最終更新は議案の updated_at のうち最も新しいもの", () => {
    const view = buildHomeView(
      [
        bill("a", 1, { updatedAt: "2026-10-03T15:00:00+00:00" }),
        bill("b", 2, { updatedAt: "2026-09-01T00:00:00+00:00" }),
        bill("c", 3, { updatedAt: "not-a-date" }),
      ],
      []
    );

    expect(view.lastUpdatedAt).toBe("2026-10-03T15:00:00+00:00");
  });

  it("最も古い提出日の年を出し、提出日の無い議案は数えない", () => {
    const view = buildHomeView(
      [
        bill("a", 1, { submittedDate: "2021-02-17T00:00:00+00:00" }),
        bill("b", 2, { submittedDate: "2019-06-05T00:00:00+00:00" }),
        bill("c", 3, { submittedDate: null }),
      ],
      []
    );

    expect(view.earliestYear).toBe(2019);
  });

  it("議案が無ければ最終更新は null", () => {
    const view = buildHomeView([], [budget]);

    expect(view.lastUpdatedAt).toBeNull();
    expect(view.earliestYear).toBeNull();
    expect(view.featured).toEqual({ kind: "recent", bills: [] });
    expect(view.themeChips).toEqual([]);
  });
});

describe("buildHomeView の AIインタビュー", () => {
  it("AIインタビューを受け付けている議案を数える", () => {
    const view = buildHomeView(
      [
        bill("a", 1, { hasPublicInterview: true }),
        bill("b", 2),
        bill("c", 3, { hasPublicInterview: true }),
      ],
      []
    );

    expect(view.interviewOpenCount).toBe(2);
  });
});

describe("describeFeaturedSection", () => {
  it("審議中の議案があれば件数を添える", () => {
    expect(describeFeaturedSection("deliberating", 28, true)).toEqual({
      title: "審議中の議案",
      description:
        "いま28件が審議中です。議決の前に中身を確かめておきましょう。",
    });
  });

  it("閉会中なら閉会中と書く", () => {
    expect(describeFeaturedSection("recent", 0, false)).toEqual({
      title: "最近議決された議案",
      description: "新宿区議会はいま閉会中です。最近議決された議案です。",
    });
  });

  // 開会直後で議案を取り込む前など。お知らせ帯の「開会中」と食い違わせない。
  it("会期が開いているのに審議中が0件なら、閉会中とは書かない", () => {
    const copy = describeFeaturedSection("recent", 0, true);

    expect(copy.title).toBe("最近議決された議案");
    expect(copy.description).not.toContain("閉会中");
    expect(copy.description).toBe(
      "審議中の議案はまだ掲載していません。最近議決された議案です。"
    );
  });
});
