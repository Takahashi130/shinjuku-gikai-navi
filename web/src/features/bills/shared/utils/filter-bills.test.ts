import { describe, expect, it } from "vitest";
import { filterBills } from "./filter-bills";

function bill(
  id: string,
  overrides: {
    title?: string;
    tags?: string[];
    hasPublicInterview?: boolean;
    isFeatured?: boolean;
    slug?: string;
  } = {}
) {
  return {
    id,
    slug: overrides.slug ?? `r8-teirei-3-gian-${id}`,
    name: `${id} 法律案`,
    bill_content: { title: overrides.title ?? `${id} のタイトル` } as never,
    tags: (overrides.tags ?? []).map((label) => ({ id: label, label })),
    hasPublicInterview: overrides.hasPublicInterview ?? false,
    is_featured: overrides.isFeatured ?? false,
  };
}

const ids = (bills: { id: string }[]) => bills.map((b) => b.id);
const base = {
  query: "",
  tagId: null,
  interviewOnly: false,
  splitOnly: false,
  memberSubmittedOnly: false,
};

describe("filterBills", () => {
  it("既定では絞り込まない", () => {
    const bills = [bill("a"), bill("b")];
    expect(ids(filterBills(bills, base))).toEqual(["a", "b"]);
  });

  it("議員提出議案だけに絞る", () => {
    const bills = [
      bill("a", { slug: "r8-teirei-2-giin-10" }),
      bill("b", { slug: "r8-teirei-2-gian-5" }),
    ];
    expect(
      ids(filterBills(bills, { ...base, memberSubmittedOnly: true }))
    ).toEqual(["a"]);
  });

  it("キーワードで絞る", () => {
    const bills = [bill("a", { title: "ガソリン税" }), bill("b")];
    expect(ids(filterBills(bills, { ...base, query: "ガソリン" }))).toEqual([
      "a",
    ]);
  });

  it("カテゴリで絞る", () => {
    const bills = [
      bill("a", { tags: ["税金"] }),
      bill("b", { tags: ["教育"] }),
    ];
    expect(ids(filterBills(bills, { ...base, tagId: "税金" }))).toEqual(["a"]);
  });

  it("受付中のみに絞る", () => {
    const bills = [
      bill("open", { hasPublicInterview: true }),
      bill("closed", { hasPublicInterview: false }),
    ];
    expect(ids(filterBills(bills, { ...base, interviewOnly: true }))).toEqual([
      "open",
    ]);
  });

  it("会派の賛否が分かれた議案のみに絞る", () => {
    const bills = [
      bill("split", { isFeatured: true }),
      bill("unanimous", { isFeatured: false }),
    ];
    expect(ids(filterBills(bills, { ...base, splitOnly: true }))).toEqual([
      "split",
    ]);
  });

  it("複数の条件を重ねる", () => {
    const bills = [
      bill("hit", {
        title: "ガソリン税",
        tags: ["税金"],
        hasPublicInterview: true,
      }),
      bill("noTag", {
        title: "ガソリン税",
        tags: ["教育"],
        hasPublicInterview: true,
      }),
      bill("noInterview", { title: "ガソリン税", tags: ["税金"] }),
    ];

    expect(
      ids(
        filterBills(bills, {
          query: "ガソリン",
          tagId: "税金",
          interviewOnly: true,
          splitOnly: false,
          memberSubmittedOnly: false,
        })
      )
    ).toEqual(["hit"]);
  });

  it("元の配列を壊さない", () => {
    const input = [bill("a")];
    filterBills(input, base).push(bill("b"));
    expect(input).toHaveLength(1);
  });
});
