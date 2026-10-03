import { describe, expect, it } from "vitest";
import { buildActiveFilters, clearFiltersHref } from "./active-filters";
import {
  type BillsListParams,
  DEFAULT_BILLS_LIST_PARAMS,
} from "./parse-bills-list-params";

const tags = [{ id: "budget", label: "予算・お金" }];
const params = (patch: Partial<BillsListParams> = {}): BillsListParams => ({
  ...DEFAULT_BILLS_LIST_PARAMS,
  ...patch,
});

describe("buildActiveFilters", () => {
  it("絞り込みが無ければ空", () => {
    expect(buildActiveFilters(params(), tags)).toEqual([]);
  });

  it("並び替えとページは絞り込みとして出さない", () => {
    expect(buildActiveFilters(params({ sort: "old", page: 3 }), tags)).toEqual(
      []
    );
  });

  it("効いている条件を並べ、それぞれ自分だけを外すリンクにする", () => {
    const current = params({
      query: "税",
      status: "enacted",
      tagId: "budget",
      splitOnly: true,
      interviewOnly: true,
      sort: "old",
    });

    expect(buildActiveFilters(current, tags)).toEqual([
      {
        key: "query",
        label: "「税」",
        removeHref:
          "/bills?status=enacted&tag=budget&sort=old&interview=1&split=1",
      },
      {
        key: "status",
        label: "可決",
        removeHref:
          "/bills?q=%E7%A8%8E&tag=budget&sort=old&interview=1&split=1",
      },
      {
        key: "tag",
        label: "予算・お金",
        removeHref:
          "/bills?q=%E7%A8%8E&status=enacted&sort=old&interview=1&split=1",
      },
      {
        key: "split",
        label: "賛否が分かれた議案",
        removeHref:
          "/bills?q=%E7%A8%8E&status=enacted&tag=budget&sort=old&interview=1",
      },
      {
        key: "interview",
        label: "AIインタビュー受付中",
        removeHref:
          "/bills?q=%E7%A8%8E&status=enacted&tag=budget&sort=old&split=1",
      },
    ]);
  });

  it("知らないタグでも絞っていることは示す", () => {
    expect(
      buildActiveFilters(params({ tagId: "unknown" }), tags)[0].label
    ).toBe("テーマ");
  });
});

describe("clearFiltersHref", () => {
  it("絞り込みをすべて外し、並び替えは残す", () => {
    expect(
      clearFiltersHref(
        params({
          query: "税",
          status: "rejected",
          tagId: "budget",
          splitOnly: true,
          interviewOnly: true,
          sort: "old",
          page: 4,
        })
      )
    ).toBe("/bills?sort=old");
  });
});
