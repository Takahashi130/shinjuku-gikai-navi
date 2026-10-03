import { describe, expect, it } from "vitest";
import {
  buildStatusRows,
  compareBillSlugs,
  readinessLabel,
  statusRowLabel,
} from "./build-status-rows";

describe("buildStatusRows", () => {
  const now = new Date("2026-10-10T00:00:00Z");
  const rows = buildStatusRows({
    bills: [
      { slug: "r8-teirei-3-gian-63", name: "補正予算" },
      { slug: "r8-teirei-3-gian-64", name: "補正予算2" },
      { slug: "r8-teirei-3-doi-1", name: "教育委員" },
      { slug: null, name: "slug なし" },
    ],
    files: new Map([
      [
        "r8-teirei-3-gian-63",
        { status: "published", version: 2, errors: 0, warnings: 0 },
      ],
      [
        "r8-teirei-3-gian-64",
        { status: "draft", version: 1, errors: 1, warnings: 0 },
      ],
    ]),
    materials: new Set(["r8-teirei-3-gian-63"]),
    db: new Map([
      [
        "r8-teirei-3-gian-63",
        {
          status: "published" as const,
          version: 1,
          reviewedAt: "2026-10-05T00:00:00Z",
          publishAt: null,
        },
      ],
    ]),
    voteAt: "2026-10-15T14:00:00+09:00",
    now,
  });

  it("議案ごとに画面での見え方と、同期が必要かを出す", () => {
    expect(
      rows.map((r) => [r.slug, r.readiness.state, r.hasMaterial, r.needsSync])
    ).toEqual([
      ["r8-teirei-3-gian-63", "available", true, true],
      ["r8-teirei-3-gian-64", "preparing", false, true],
      ["r8-teirei-3-doi-1", "not_applicable", false, false],
    ]);
  });

  it("見え方を日本語で表す", () => {
    expect(rows.map((r) => readinessLabel(r.readiness))).toEqual([
      "公開中",
      "準備中",
      "対象外（人事案件）",
    ]);
  });

  it("下書きが DB に無い議案は、画面と同じく「まだありません」と出す（材料が無ければ添える）", () => {
    expect(rows.map((r) => [r.slug, r.hasDraft, statusRowLabel(r)])).toEqual([
      ["r8-teirei-3-gian-63", true, "公開中"],
      ["r8-teirei-3-gian-64", false, "まだありません（材料なし）"],
      ["r8-teirei-3-doi-1", false, "対象外（人事案件）"],
    ]);
  });

  it("下書きが DB にあれば「準備中」、材料だけあれば「まだありません」", () => {
    const preparing = { state: "preparing", afterVote: false } as const;
    expect(
      readinessLabel(preparing, { hasDraft: true, hasMaterial: false })
    ).toBe("準備中");
    expect(
      readinessLabel(preparing, { hasDraft: false, hasMaterial: true })
    ).toBe("まだありません");
    expect(
      readinessLabel(
        { state: "preparing", afterVote: true },
        { hasDraft: true, hasMaterial: true }
      )
    ).toBe("準備中（採決後に公開）");
  });
});

describe("compareBillSlugs", () => {
  it("末尾の番号を数として比べる", () => {
    expect(
      ["r8-teirei-3-gian-100", "r8-teirei-3-gian-63", "r8-teirei-3-doi-1"].sort(
        compareBillSlugs
      )
    ).toEqual([
      "r8-teirei-3-doi-1",
      "r8-teirei-3-gian-63",
      "r8-teirei-3-gian-100",
    ]);
  });
});
