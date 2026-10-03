import { describe, expect, it } from "vitest";
import {
  type ExplainerPublication,
  explainerReadiness,
  isExplainerPublic,
  isPersonnelBill,
  isPersonnelBillSlug,
} from "./explainer-readiness";

const now = new Date("2026-10-10T00:00:00Z");
const VOTE_AT = "2026-10-15T14:00:00+09:00";
const published: ExplainerPublication = {
  status: "published",
  reviewedAt: "2026-10-05T00:00:00Z",
  publishAt: null,
};

describe("isPersonnelBillSlug", () => {
  it.each([
    ["r8-teirei-3-doi-1", true],
    ["r8-teirei-3-shimon-2", true],
    ["r8-teirei-3-gian-63", false],
    ["r8-teirei-3-nintei-1", false],
    [null, false],
  ])("%s → %s", (slug, expected) => {
    expect(isPersonnelBillSlug(slug)).toBe(expected);
  });
});

describe("isPersonnelBill", () => {
  it.each([
    [{ slug: "r8-teirei-3-doi-1", name: "教育委員会委員の任命について" }, true],
    [
      {
        slug: "r7-teirei-2-giin-7",
        name: "東京都後期高齢者医療広域連合議会議員選挙候補者の推薦について",
      },
      true,
    ],
    [{ slug: "r8-teirei-3-giin-11", name: "意見書の提出について" }, false],
    [{ slug: "r8-teirei-3-gian-63", name: null }, false],
    [{ slug: null, name: null }, false],
  ])("%o → %s", (bill, expected) => {
    expect(isPersonnelBill(bill)).toBe(expected);
  });
});

describe("isExplainerPublic", () => {
  it("公開・照合済み・予約公開なしなら公開する", () => {
    expect(isExplainerPublic(published, now)).toBe(true);
  });

  it("予約公開の日時より前は公開しない", () => {
    expect(
      isExplainerPublic(
        { ...published, publishAt: "2026-10-11T00:00:00Z" },
        now
      )
    ).toBe(false);
    expect(
      isExplainerPublic(
        { ...published, publishAt: "2026-10-09T00:00:00Z" },
        now
      )
    ).toBe(true);
  });

  it("下書き・照合なし・不正な日時は公開しない", () => {
    expect(isExplainerPublic({ ...published, status: "draft" }, now)).toBe(
      false
    );
    expect(isExplainerPublic({ ...published, reviewedAt: null }, now)).toBe(
      false
    );
    expect(
      isExplainerPublic({ ...published, publishAt: "not-a-date" }, now)
    ).toBe(false);
    expect(isExplainerPublic(null, now)).toBe(false);
  });
});

describe("explainerReadiness", () => {
  const base = {
    billSlug: "r8-teirei-3-gian-63",
    billName: "補正予算",
    voteAt: VOTE_AT,
    now,
  };

  it("人事案件は対象外", () => {
    expect(
      explainerReadiness({
        ...base,
        billSlug: "r8-teirei-3-doi-1",
        explainer: published,
      })
    ).toEqual({ state: "not_applicable", reason: "personnel" });
  });

  it("特定の人を推薦する議案（議員提出議案）も対象外", () => {
    expect(
      explainerReadiness({
        ...base,
        billSlug: "r7-teirei-2-giin-7",
        billName: "東京都後期高齢者医療広域連合議会議員選挙候補者の推薦について",
        explainer: null,
      })
    ).toEqual({ state: "not_applicable", reason: "personnel" });
  });

  it("公開済みなら available", () => {
    expect(explainerReadiness({ ...base, explainer: published })).toEqual({
      state: "available",
    });
  });

  it("予約公開の前なら scheduled", () => {
    const publishAt = "2026-10-12T00:00:00Z";
    expect(
      explainerReadiness({
        ...base,
        explainer: { ...published, publishAt },
      })
    ).toEqual({ state: "scheduled", publishAt });
  });

  it("下書きがあれば準備中（採決後かどうかも返す）", () => {
    const draft = { ...published, status: "draft" as const, reviewedAt: null };
    expect(explainerReadiness({ ...base, explainer: draft })).toEqual({
      state: "preparing",
      afterVote: false,
    });
    expect(
      explainerReadiness({
        ...base,
        explainer: draft,
        now: new Date("2026-10-16T00:00:00Z"),
      })
    ).toEqual({ state: "preparing", afterVote: true });
  });

  it("解説が無く採決前なら準備中、採決後なら過去の議案", () => {
    expect(explainerReadiness({ ...base, explainer: null })).toEqual({
      state: "preparing",
      afterVote: false,
    });
    expect(
      explainerReadiness({
        ...base,
        explainer: null,
        now: new Date("2026-10-16T00:00:00Z"),
      })
    ).toEqual({ state: "not_available", reason: "past_bill" });
  });

  it("採決予定が分からない議案で解説が無ければ過去の議案", () => {
    expect(
      explainerReadiness({ ...base, voteAt: null, explainer: null })
    ).toEqual({ state: "not_available", reason: "past_bill" });
  });

  it("取り下げた解説は出さない", () => {
    expect(
      explainerReadiness({
        ...base,
        explainer: { ...published, status: "withdrawn" },
      })
    ).toEqual({ state: "not_available", reason: "withdrawn" });
  });
});
