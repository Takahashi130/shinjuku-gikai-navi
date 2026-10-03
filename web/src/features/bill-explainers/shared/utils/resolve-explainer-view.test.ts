import { describe, expect, it } from "vitest";
import { sampleBillExplainer } from "./explainer-fixtures";
import type { BillExplainerRow } from "./parse-explainer-row";
import { resolveExplainerView } from "./resolve-explainer-view";

const VOTE_AT = "2026-10-15T05:00:00.000Z";
const BEFORE_VOTE = new Date("2026-10-10T00:00:00Z");
const AFTER_VOTE = new Date("2026-10-20T00:00:00Z");

function row(overrides: Partial<BillExplainerRow> = {}): BillExplainerRow {
  const sample = sampleBillExplainer();
  return {
    bill_id: sample.billId,
    status: "published",
    body: sample.body,
    sources: sample.sources,
    version: 1,
    reviewed_at: "2026-10-05T01:00:00Z",
    reviewed_by: "ai-crosscheck",
    generated_by: "claude-opus-5-5",
    publish_at: null,
    first_published_at: "2026-10-05T01:00:00Z",
    updated_at: "2026-10-05T01:00:00Z",
    source_path: null,
    ...overrides,
  };
}

describe("resolveExplainerView", () => {
  it("公開済み・照合済みなら解説を出す", () => {
    const view = resolveExplainerView({
      billSlug: "r8-teirei-3-gian-63",
      billName: null,
      voteAt: VOTE_AT,
      row: row(),
      now: BEFORE_VOTE,
    });
    expect(view.kind).toBe("available");
    if (view.kind === "available") {
      expect(view.explainer.isDraft).toBe(false);
    }
  });

  it("予約公開の前は出さず、予定を返す", () => {
    expect(
      resolveExplainerView({
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        voteAt: VOTE_AT,
        row: row({ publish_at: "2026-10-12T00:00:00Z" }),
        now: BEFORE_VOTE,
      })
    ).toEqual({
      kind: "absent",
      readiness: { state: "scheduled", publishAt: "2026-10-12T00:00:00Z" },
      hasDraft: true,
    });
  });

  it("下書きは公開ページでは出さない（準備中）", () => {
    expect(
      resolveExplainerView({
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        voteAt: VOTE_AT,
        row: row({ status: "draft", reviewed_at: null, reviewed_by: null }),
        now: BEFORE_VOTE,
      })
    ).toEqual({
      kind: "absent",
      readiness: { state: "preparing", afterVote: false },
      hasDraft: true,
    });
  });

  it("プレビューでは下書きも出す（下書きの印つき）", () => {
    const view = resolveExplainerView({
      billSlug: "r8-teirei-3-gian-63",
      billName: null,
      voteAt: VOTE_AT,
      row: row({ status: "draft", reviewed_at: null, reviewed_by: null }),
      now: BEFORE_VOTE,
      includeDraft: true,
    });
    expect(view.kind).toBe("available");
    if (view.kind === "available") expect(view.explainer.isDraft).toBe(true);
  });

  it("取り下げた解説はプレビューでも出さない", () => {
    expect(
      resolveExplainerView({
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        voteAt: VOTE_AT,
        row: row({ status: "withdrawn" }),
        now: BEFORE_VOTE,
        includeDraft: true,
      })
    ).toEqual({
      kind: "absent",
      readiness: { state: "not_available", reason: "withdrawn" },
      hasDraft: false,
    });
  });

  it("人事案件は解説があっても対象外", () => {
    expect(
      resolveExplainerView({
        billSlug: "r8-teirei-3-doi-1",
        billName: null,
        voteAt: VOTE_AT,
        row: row(),
        now: BEFORE_VOTE,
        includeDraft: true,
      })
    ).toEqual({
      kind: "absent",
      readiness: { state: "not_applicable", reason: "personnel" },
      hasDraft: true,
    });
  });

  it("解説が無く採決前なら準備中、採決後なら過去の議案", () => {
    expect(
      resolveExplainerView({
        billSlug: "r8-teirei-3-giin-11",
        billName: null,
        voteAt: VOTE_AT,
        row: null,
        now: BEFORE_VOTE,
      })
    ).toEqual({
      kind: "absent",
      readiness: { state: "preparing", afterVote: false },
      hasDraft: false,
    });
    expect(
      resolveExplainerView({
        billSlug: "r7-teirei-1-gian-1",
        billName: null,
        voteAt: VOTE_AT,
        row: null,
        now: AFTER_VOTE,
      })
    ).toEqual({
      kind: "absent",
      readiness: { state: "not_available", reason: "past_bill" },
      hasDraft: false,
    });
  });

  it("公開済みでも本文が壊れていれば出さない", () => {
    expect(
      resolveExplainerView({
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        voteAt: VOTE_AT,
        row: row({ body: { broken: true } }),
        now: AFTER_VOTE,
      })
    ).toEqual({
      kind: "absent",
      readiness: { state: "preparing", afterVote: true },
      hasDraft: true,
    });
  });
});
