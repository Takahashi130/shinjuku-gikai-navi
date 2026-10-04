import { describe, expect, it } from "vitest";
import {
  type CastVoteDenyReason,
  canCastVote,
  castVoteDenyMessage,
} from "./can-cast-vote";

const CLOSES_AT = "2026-10-15T05:00:00.000Z";
const OPEN = { state: "open", closesAt: CLOSES_AT } as const;

describe("canCastVote", () => {
  it("締切前・公開済み・誰でも参加できる回なら投票できる", () => {
    expect(
      canCastVote({
        pollState: OPEN,
        billPublished: true,
        audience: "anyone",
        eligibility: "unverified",
      })
    ).toEqual({ ok: true });
  });

  it("採決後も受け付けている回なら投票できる", () => {
    expect(
      canCastVote({
        pollState: {
          state: "open_after_close",
          closesAt: CLOSES_AT,
          openedAfterClose: false,
        },
        billPublished: true,
        audience: "anyone",
        eligibility: "unverified",
      })
    ).toEqual({ ok: true });
  });

  it("人事案件は投票できない", () => {
    expect(
      canCastVote({
        pollState: { state: "not_applicable", reason: "personnel" },
        billPublished: true,
        audience: "anyone",
        eligibility: "unverified",
      })
    ).toEqual({ ok: false, reason: "personnel" });
  });

  it("回が無い・非表示なら投票できない", () => {
    for (const reason of ["no_poll", "hidden"] as const) {
      expect(
        canCastVote({
          pollState: { state: "not_applicable", reason },
          billPublished: true,
          audience: "anyone",
          eligibility: "unverified",
        })
      ).toEqual({ ok: false, reason: "not_applicable" });
    }
  });

  it("受付前・受付終了なら投票できない", () => {
    expect(
      canCastVote({
        pollState: { state: "upcoming", opensAt: CLOSES_AT },
        billPublished: true,
        audience: "anyone",
        eligibility: "unverified",
      })
    ).toEqual({ ok: false, reason: "upcoming" });
    expect(
      canCastVote({
        pollState: {
          state: "closed",
          closesAt: CLOSES_AT,
          openedAfterClose: false,
        },
        billPublished: true,
        audience: "anyone",
        eligibility: "unverified",
      })
    ).toEqual({ ok: false, reason: "closed" });
  });

  it("公開前の議案（プレビュー）には投票できない", () => {
    expect(
      canCastVote({
        pollState: OPEN,
        billPublished: false,
        audience: "anyone",
        eligibility: "unverified",
      })
    ).toEqual({ ok: false, reason: "bill_unpublished" });
  });

  it("区民に限った回には、確認していない人は投票できない", () => {
    expect(
      canCastVote({
        pollState: OPEN,
        billPublished: true,
        audience: "resident_verified",
        eligibility: "unverified",
      })
    ).toEqual({ ok: false, reason: "audience" });
    expect(
      canCastVote({
        pollState: OPEN,
        billPublished: true,
        audience: "resident_verified",
        eligibility: "verified_resident",
      })
    ).toEqual({ ok: true });
  });
});

describe("castVoteDenyMessage", () => {
  it("すべての理由に文がある", () => {
    const reasons: CastVoteDenyReason[] = [
      "personnel",
      "not_applicable",
      "upcoming",
      "closed",
      "bill_unpublished",
      "audience",
    ];
    for (const reason of reasons) {
      expect(castVoteDenyMessage(reason).length).toBeGreaterThan(0);
    }
  });
});
