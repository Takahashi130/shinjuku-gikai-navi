import { explainerFileSchema } from "@mirai-gikai/shared/bill-explainer/schema";
import { describe, expect, it } from "vitest";
import {
  buildExplainerRow,
  type ExistingExplainer,
} from "./build-explainer-row";
import { explainer } from "./test-fixtures";

const now = new Date("2026-10-05T00:00:00Z");
const base = (overrides: Record<string, unknown> = {}) =>
  explainerFileSchema.parse({ ...explainer(), ...overrides });

describe("buildExplainerRow", () => {
  it("新しい解説は追加し、照合の情報と最初の公開日時を入れる", () => {
    const plan = buildExplainerRow({
      file: base(),
      billId: "bill-1",
      sourcePath: "explainers/r8-teirei-3/r8-teirei-3-gian-90.json",
      contentHash: "sha256:a",
      existing: null,
      now,
    });
    expect(plan).toMatchObject({
      ok: true,
      action: "insert",
      row: {
        bill_id: "bill-1",
        status: "published",
        version: 1,
        content_hash: "sha256:a",
        reviewed_by: "ai-crosscheck",
        reviewed_at: "2026-10-04T01:00:00+09:00",
        first_published_at: now.toISOString(),
        generated_by: "claude-test",
      },
    });
  });

  it("予約公開が未来なら、最初の公開日時はその日時にする", () => {
    const plan = buildExplainerRow({
      file: base({ publishAt: "2026-10-12T09:00:00+09:00" }),
      billId: "b",
      sourcePath: "p",
      contentHash: "h",
      existing: null,
      now,
    });
    expect(plan.ok && plan.row.first_published_at).toBe(
      "2026-10-12T09:00:00+09:00"
    );
  });

  it("下書きは最初の公開日時を入れない", () => {
    const plan = buildExplainerRow({
      file: base({ status: "draft", review: null }),
      billId: "b",
      sourcePath: "p",
      contentHash: "h",
      existing: null,
      now,
    });
    expect(plan.ok && plan.row.first_published_at).toBeNull();
    expect(plan.ok && plan.row.reviewed_at).toBeNull();
  });

  const published: ExistingExplainer = {
    status: "published",
    version: 1,
    content_hash: "sha256:a",
    reviewed_at: "2026-10-04T01:00:00+09:00",
    publish_at: null,
    first_published_at: "2026-10-04T02:00:00.000Z",
  };

  it("同じ内容なら unchanged", () => {
    const plan = buildExplainerRow({
      file: base(),
      billId: "b",
      sourcePath: "p",
      contentHash: "sha256:a",
      existing: { ...published, reviewed_at: "2026-10-03T16:00:00.000Z" },
      now,
    });
    expect(plan).toMatchObject({ ok: true, action: "unchanged" });
  });

  it("公開済みの中身を変えたのに版が同じなら止める", () => {
    const plan = buildExplainerRow({
      file: base(),
      billId: "b",
      sourcePath: "p",
      contentHash: "sha256:b",
      existing: published,
      now,
    });
    expect(plan).toMatchObject({ ok: false });
  });

  it("版を上げれば更新し、最初の公開日時は保つ", () => {
    const plan = buildExplainerRow({
      file: base({ version: 2 }),
      billId: "b",
      sourcePath: "p",
      contentHash: "sha256:b",
      existing: published,
      now,
    });
    expect(plan).toMatchObject({
      ok: true,
      action: "update",
      row: { version: 2, first_published_at: "2026-10-04T02:00:00.000Z" },
    });
  });

  it("DB より古い版のファイルでは上書きしない", () => {
    const plan = buildExplainerRow({
      file: base(),
      billId: "b",
      sourcePath: "p",
      contentHash: "sha256:a",
      existing: { ...published, version: 3 },
      now,
    });
    expect(plan).toMatchObject({ ok: false });
  });

  it("下書きは版を上げなくても中身を更新できる", () => {
    const plan = buildExplainerRow({
      file: base({ status: "draft", review: null }),
      billId: "b",
      sourcePath: "p",
      contentHash: "sha256:b",
      existing: { ...published, status: "draft", first_published_at: null },
      now,
    });
    expect(plan).toMatchObject({ ok: true, action: "update" });
  });
});
