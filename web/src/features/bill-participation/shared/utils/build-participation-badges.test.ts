import { describe, expect, it } from "vitest";
import { buildParticipationBadges } from "./build-participation-badges";

const CLOSES_AT = "2026-10-15T05:00:00.000Z";
const NOW = new Date("2026-10-12T01:00:00Z");
const AGAINST = { for: 10, against: 40, total: 50 };

describe("buildParticipationBadges", () => {
  it("解説があり、締切前なら「解説あり」と「投票受付中・あと n 日」", () => {
    expect(
      buildParticipationBadges({
        explainerPublic: true,
        pollState: { state: "open", closesAt: CLOSES_AT },
        councilStatus: "in_originating_house",
        billSlug: "r8-teirei-3-gian-63",
        votingEnabled: true,
        beforeClose: null,
        now: NOW,
      })
    ).toEqual([
      { kind: "vote_open", label: "投票受付中", detail: "あと3日" },
      { kind: "explainer", label: "解説あり" },
    ]);
  });

  it("締切前は、票があっても区民の結果を出さない", () => {
    const badges = buildParticipationBadges({
      explainerPublic: false,
      pollState: { state: "open", closesAt: CLOSES_AT },
      councilStatus: "in_originating_house",
      billSlug: null,
      votingEnabled: true,
      beforeClose: AGAINST,
      now: NOW,
    });
    expect(badges.map((b) => b.kind)).toEqual(["vote_open"]);
  });

  it("締切後は区民の多数を出し、議会と分かれていれば diverges", () => {
    expect(
      buildParticipationBadges({
        explainerPublic: true,
        pollState: {
          state: "open_after_close",
          closesAt: CLOSES_AT,
          openedAfterClose: false,
        },
        councilStatus: "enacted",
        billSlug: "r8-teirei-3-gian-63",
        votingEnabled: true,
        beforeClose: AGAINST,
        now: NOW,
      })
    ).toEqual([
      { kind: "explainer", label: "解説あり" },
      { kind: "citizens_result", label: "区民 反対多数", diverges: true },
    ]);
  });

  it("議会がまだ議決していなければ diverges にしない", () => {
    const [badge] = buildParticipationBadges({
      explainerPublic: false,
      pollState: {
        state: "closed",
        closesAt: CLOSES_AT,
        openedAfterClose: false,
      },
      councilStatus: "in_receiving_house",
      billSlug: null,
      votingEnabled: true,
      beforeClose: AGAINST,
      now: NOW,
    });
    expect(badge).toEqual({
      kind: "citizens_result",
      label: "区民 反対多数",
      diverges: false,
    });
  });

  it("票が少なければ区民の結果は出さない。拮抗は出す", () => {
    expect(
      buildParticipationBadges({
        explainerPublic: false,
        pollState: {
          state: "open_after_close",
          closesAt: CLOSES_AT,
          openedAfterClose: false,
        },
        councilStatus: "enacted",
        billSlug: null,
        votingEnabled: true,
        beforeClose: { for: 3, against: 1, total: 4 },
        now: NOW,
      })
    ).toEqual([]);
    expect(
      buildParticipationBadges({
        explainerPublic: false,
        pollState: {
          state: "open_after_close",
          closesAt: CLOSES_AT,
          openedAfterClose: false,
        },
        councilStatus: "enacted",
        billSlug: null,
        votingEnabled: true,
        beforeClose: { for: 20, against: 20, total: 40 },
        now: NOW,
      })
    ).toEqual([
      { kind: "citizens_result", label: "区民 拮抗", diverges: false },
    ]);
  });

  // 緊急停止中に「投票受付中」を出すと、押した先の議案ページで投票できない
  it("投票の受付を止めているあいだは「投票受付中」を出さない", () => {
    expect(
      buildParticipationBadges({
        explainerPublic: true,
        pollState: { state: "open", closesAt: CLOSES_AT },
        councilStatus: "in_originating_house",
        billSlug: "r8-teirei-3-gian-63",
        votingEnabled: false,
        beforeClose: null,
        now: NOW,
      })
    ).toEqual([{ kind: "explainer", label: "解説あり" }]);
  });

  it("投票の対象外なら投票の印は出さない", () => {
    expect(
      buildParticipationBadges({
        explainerPublic: false,
        pollState: { state: "not_applicable", reason: "personnel" },
        councilStatus: "enacted",
        billSlug: "r8-teirei-3-doi-1",
        votingEnabled: true,
        beforeClose: AGAINST,
        now: NOW,
      })
    ).toEqual([]);
  });
});
