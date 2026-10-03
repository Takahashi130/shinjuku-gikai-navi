import { describe, expect, it } from "vitest";
import { pickHomeSections } from "./pick-home-sections";

const bill = (id: string) => ({ id });
const group = (label: string, ...billIds: string[]) => ({
  tag: { id: label, label },
  bills: billIds.map(bill),
});

const shape = (groups: { tag: { id: string }; bills: { id: string }[] }[]) =>
  groups.map((g) => [g.tag.id, g.bills.map((b) => b.id)]);

const base = {
  billsByTag: [] as ReturnType<typeof group>[],
  featuredBills: [] as { id: string }[],
  interviewOpenBills: [] as { id: string }[],
  inSession: true,
};

describe("pickHomeSections", () => {
  describe("tagGroups", () => {
    it("上のセクションに出ていなければそのまま残す", () => {
      const result = pickHomeSections({
        ...base,
        billsByTag: [group("暮らし", "a"), group("税金", "b")],
      });

      expect(shape(result.tagGroups)).toEqual([
        ["暮らし", ["a"]],
        ["税金", ["b"]],
      ]);
    });

    it("受付中に出した議案をタグ別から外す", () => {
      const result = pickHomeSections({
        ...base,
        billsByTag: [group("暮らし", "a", "b")],
        interviewOpenBills: [bill("b")],
      });

      expect(shape(result.tagGroups)).toEqual([["暮らし", ["a"]]]);
    });

    it("注目に出した議案をタグ別から外す", () => {
      const result = pickHomeSections({
        ...base,
        billsByTag: [group("暮らし", "a", "b")],
        featuredBills: [bill("a")],
      });

      expect(shape(result.tagGroups)).toEqual([["暮らし", ["b"]]]);
    });

    // 閉会中は注目セクションが出ないので、外すと画面のどこにも出なくなる。
    it("閉会中は注目の議案をタグ別から外さない", () => {
      const result = pickHomeSections({
        ...base,
        billsByTag: [group("暮らし", "a", "b")],
        featuredBills: [bill("a")],
        inSession: false,
      });

      expect(shape(result.tagGroups)).toEqual([["暮らし", ["a", "b"]]]);
    });

    it("同じ議案が複数のタグに付いていれば全てのタグから外す", () => {
      const result = pickHomeSections({
        ...base,
        billsByTag: [group("暮らし", "a", "x"), group("税金", "x", "b")],
        interviewOpenBills: [bill("x")],
      });

      expect(shape(result.tagGroups)).toEqual([
        ["暮らし", ["a"]],
        ["税金", ["b"]],
      ]);
    });

    // 見出しだけが残ると、中身が無いカテゴリが並んでしまう。
    it("全件外れたタグはグループごと落とす", () => {
      const result = pickHomeSections({
        ...base,
        billsByTag: [group("暮らし", "a"), group("税金", "b", "c")],
        interviewOpenBills: [bill("b"), bill("c")],
      });

      expect(shape(result.tagGroups)).toEqual([["暮らし", ["a"]]]);
    });

    it("渡した配列を書き換えない", () => {
      const billsByTag = [group("暮らし", "a", "b")];

      pickHomeSections({
        ...base,
        billsByTag,
        interviewOpenBills: [bill("a")],
      });

      expect(shape(billsByTag)).toEqual([["暮らし", ["a", "b"]]]);
    });
  });
});
