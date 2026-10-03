import { describe, expect, it } from "vitest";
import type { BillListItem } from "../types";
import { buildBillsListView } from "./build-bills-list-view";
import {
  type BillsListParams,
  DEFAULT_BILLS_LIST_PARAMS,
} from "./parse-bills-list-params";

const zei = { id: "zei", label: "税金" };
const kyoiku = { id: "kyoiku", label: "教育" };
const featuredTags = [zei, kyoiku];

/**
 * 40件の議案。偶数番目は成立、奇数番目は審議中。4の倍数番目は税金、それ以外は
 * 教育のタグを持つ。提出日は番号順に1日ずつ新しくなる。
 */
const bills: BillListItem[] = Array.from({ length: 40 }, (_, i) => ({
  id: `bill-${i}`,
  name: `議案${i}`,
  status: i % 2 === 0 ? "enacted" : "introduced",
  submitted_date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
  updated_at: "2026-06-01T00:00:00Z",
  thumbnail_url: null,
  is_review_completed: false,
  // 5の倍数番目は会派の賛否が分かれた議案
  is_featured: i % 5 === 0,
  bill_content: { title: `議案${i}のタイトル`, summary: "" },
  tags: i % 4 === 0 ? [zei] : [kyoiku],
  hasPublicInterview: false,
}));

const params = (patch: Partial<BillsListParams> = {}): BillsListParams => ({
  ...DEFAULT_BILLS_LIST_PARAMS,
  ...patch,
});

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("buildBillsListView", () => {
  // どのページを開いているかで数字が変わらないようにする。
  it("件数はページ分割の前の全体から数える", () => {
    const first = buildBillsListView(bills, featuredTags, params({ page: 1 }));
    const second = buildBillsListView(bills, featuredTags, params({ page: 2 }));

    expect(second.statusCounts).toEqual({
      all: 40,
      deliberating: 20,
      waiting: 0,
      enacted: 20,
      rejected: 0,
    });
    expect(second.tagChips).toEqual([
      { id: "all", label: "すべて", tagId: null, count: 40 },
      { id: "zei", label: "税金", tagId: "zei", count: 10 },
      { id: "kyoiku", label: "教育", tagId: "kyoiku", count: 30 },
    ]);
    expect(second.statusCounts).toEqual(first.statusCounts);
    expect(second.tagChips).toEqual(first.tagChips);
    expect(second.pageBills).toHaveLength(10);
  });

  it("並び替えたあと、要求されたページの分だけ切り出す", () => {
    const view = buildBillsListView(
      bills,
      featuredTags,
      params({ sort: "new", page: 2 })
    );

    // 新しい順なので bill-39 が先頭。2ページ目は31件目（bill-9）から。
    expect(ids(view.pageBills)).toEqual(
      Array.from({ length: 10 }, (_, i) => `bill-${9 - i}`)
    );
    expect(view.pageInfo).toMatchObject({
      page: 2,
      totalPages: 2,
      totalCount: 40,
      startIndex: 30,
      endIndex: 40,
    });
  });

  it("1ページの件数を指定できる", () => {
    const view = buildBillsListView(
      bills,
      featuredTags,
      params({ page: 3 }),
      7
    );

    expect(view.pageBills).toHaveLength(7);
    expect(view.pageInfo).toMatchObject({ page: 3, totalPages: 6 });
  });

  // ステータスで絞ったあとでも、他のタブに何件あるかは見えている必要がある。
  it("ステータスのタブはステータスで絞る前から数える", () => {
    const view = buildBillsListView(
      bills,
      featuredTags,
      params({ status: "enacted" })
    );

    expect(view.statusCounts).toMatchObject({
      all: 40,
      deliberating: 20,
      enacted: 20,
    });
    expect(view.pageInfo.totalCount).toBe(20);
    expect(view.pageBills.every((bill) => bill.status === "enacted")).toBe(
      true
    );
  });

  it("カテゴリのチップはタグで絞る前から数え、ステータスの絞り込みは効かせる", () => {
    const view = buildBillsListView(
      bills,
      featuredTags,
      params({ status: "enacted", tagId: "zei" })
    );

    // 成立の20件のうち、税金は4の倍数番目の10件、教育は残りの10件。
    expect(view.tagChips).toEqual([
      { id: "all", label: "すべて", tagId: null, count: 20 },
      { id: "zei", label: "税金", tagId: "zei", count: 10 },
      { id: "kyoiku", label: "教育", tagId: "kyoiku", count: 10 },
    ]);
    // タブはタグで絞った母集合（税金の10件はすべて成立）から数える。
    expect(view.statusCounts).toMatchObject({
      all: 10,
      enacted: 10,
      deliberating: 0,
    });
    expect(view.pageInfo.totalCount).toBe(10);
  });

  // 消すと、何で絞られているのか画面から分からなくなる。
  it("選んだタグは0件でもチップに残す", () => {
    const view = buildBillsListView(
      bills,
      featuredTags,
      params({ status: "deliberating", tagId: "zei" })
    );

    expect(view.tagChips.find((chip) => chip.id === "zei")).toMatchObject({
      count: 0,
    });
    expect(view.pageBills).toEqual([]);
  });

  it("キーワードの絞り込みは件数にも効く", () => {
    const view = buildBillsListView(
      bills,
      featuredTags,
      params({ query: "議案1のタイトル" })
    );

    expect(ids(view.pageBills)).toEqual(["bill-1"]);
    expect(view.statusCounts).toMatchObject({ all: 1, deliberating: 1 });
    expect(view.tagChips[0]).toMatchObject({ id: "all", count: 1 });
  });

  // 0, 5, 10, ..., 35 の8件。偶数番目（0, 10, 20, 30）が成立、残りが審議中。
  it("賛否が分かれた議案のみの絞り込みは件数にも効く", () => {
    const view = buildBillsListView(
      bills,
      featuredTags,
      params({ splitOnly: true })
    );

    expect(view.statusCounts).toMatchObject({
      all: 8,
      enacted: 4,
      deliberating: 4,
    });
    expect(ids(view.pageBills)).toEqual([
      "bill-35",
      "bill-30",
      "bill-25",
      "bill-20",
      "bill-15",
      "bill-10",
      "bill-5",
      "bill-0",
    ]);
  });

  // 絞り込みで件数が減ったあとに古いページ番号の URL が開かれても空にしない。
  it("最終ページを超える番号は最終ページに丸める", () => {
    const view = buildBillsListView(bills, featuredTags, params({ page: 99 }));

    expect(view.pageInfo.page).toBe(2);
    expect(view.pageBills).toHaveLength(10);
  });
});
