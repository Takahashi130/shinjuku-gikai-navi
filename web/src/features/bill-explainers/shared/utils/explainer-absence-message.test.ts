import { describe, expect, it } from "vitest";
import { explainerAbsenceMessage } from "./explainer-absence-message";

const NOW = new Date("2026-10-04T00:00:00Z");

describe("explainerAbsenceMessage", () => {
  it("人事案件は対象外と出す", () => {
    expect(
      explainerAbsenceMessage(
        {
          kind: "absent",
          readiness: { state: "not_applicable", reason: "personnel" },
          hasDraft: false,
        },
        NOW
      ).title
    ).toBe("人事案件のため、解説の対象外です");
  });

  it("過去の議案は、解説の対象になっていないと出す", () => {
    expect(
      explainerAbsenceMessage(
        {
          kind: "absent",
          readiness: { state: "not_available", reason: "past_bill" },
          hasDraft: false,
        },
        NOW
      ).title
    ).toBe("この議案の解説はありません");
  });

  it("取り下げた解説はその旨を出す", () => {
    expect(
      explainerAbsenceMessage(
        {
          kind: "absent",
          readiness: { state: "not_available", reason: "withdrawn" },
          hasDraft: true,
        },
        NOW
      ).title
    ).toBe("この議案の解説は取り下げました");
  });

  it("予約公開は日本時間の公開日時を出す", () => {
    expect(
      explainerAbsenceMessage(
        {
          kind: "absent",
          readiness: { state: "scheduled", publishAt: "2026-10-12T00:00:00Z" },
          hasDraft: true,
        },
        NOW
      ).title
    ).toBe("解説は 10月12日（月）09:00 に公開します");
  });

  it("下書きがあれば「準備しています」、採決後なら間に合わなかったことも出す", () => {
    expect(
      explainerAbsenceMessage(
        {
          kind: "absent",
          readiness: { state: "preparing", afterVote: false },
          hasDraft: true,
        },
        NOW
      )
    ).toEqual({
      title: "解説を準備しています",
      detail: "資料との照合が済みしだい公開します。",
    });
    expect(
      explainerAbsenceMessage(
        {
          kind: "absent",
          readiness: { state: "preparing", afterVote: true },
          hasDraft: true,
        },
        NOW
      ).detail
    ).toContain("採決には間に合いませんでした");
  });

  it("下書きが無ければ「まだありません」と出し、作る約束はしない", () => {
    const message = explainerAbsenceMessage(
      {
        kind: "absent",
        readiness: { state: "preparing", afterVote: false },
        hasDraft: false,
      },
      NOW
    );
    expect(message.title).toBe("この議案の解説はまだありません");
  });
});
