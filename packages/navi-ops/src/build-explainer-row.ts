import type { ExplainerFile } from "@mirai-gikai/shared/bill-explainer/schema";
import type { Database } from "@mirai-gikai/supabase";

export type ExplainerInsert =
  Database["public"]["Tables"]["bill_explainers"]["Insert"];

/** DB にすでにある解説（比べるのに使う列だけ） */
export type ExistingExplainer = {
  status: string;
  version: number;
  content_hash: string;
  reviewed_at: string | null;
  publish_at: string | null;
  first_published_at: string | null;
};

export type ExplainerRowPlan =
  | {
      ok: true;
      action: "insert" | "update" | "unchanged";
      row: ExplainerInsert;
    }
  | { ok: false; reason: string };

function sameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return new Date(a).getTime() === new Date(b).getTime();
}

/**
 * 解説ファイルから bill_explainers の行を作る。
 *
 * - 公開済みの解説の中身を変えたのに version が上がっていなければ止める（「直したら版を上げる」）
 * - DB より古い version のファイルでは上書きしない
 * - first_published_at は最初に公開したときの日時を保つ
 */
export function buildExplainerRow(input: {
  file: ExplainerFile;
  billId: string;
  sourcePath: string;
  contentHash: string;
  existing: ExistingExplainer | null;
  now: Date;
}): ExplainerRowPlan {
  const { file, billId, sourcePath, contentHash, existing, now } = input;

  if (existing) {
    if (file.version < existing.version) {
      return {
        ok: false,
        reason: `DB の版（${existing.version}）よりファイルの版（${file.version}）が古い`,
      };
    }
    if (
      existing.status === "published" &&
      existing.content_hash !== contentHash &&
      file.version === existing.version
    ) {
      return {
        ok: false,
        reason:
          "公開済みの解説の中身が変わっている。version を上げてから同期する",
      };
    }
  }

  const published = file.status === "published";
  const publishAt = file.publishAt;
  const firstPublishedAt =
    existing?.first_published_at ??
    (published
      ? publishAt && new Date(publishAt) > now
        ? publishAt
        : now.toISOString()
      : null);

  const row: ExplainerInsert = {
    bill_id: billId,
    status: file.status,
    body: file.body,
    sources: file.sources,
    version: file.version,
    content_hash: contentHash,
    source_path: sourcePath,
    generated_by: file.author.model,
    reviewed_at: file.review?.reviewedAt ?? null,
    reviewed_by: file.review?.reviewedBy ?? null,
    publish_at: publishAt,
    first_published_at: firstPublishedAt,
  };

  if (!existing) return { ok: true, action: "insert", row };
  const unchanged =
    existing.content_hash === contentHash &&
    existing.status === file.status &&
    existing.version === file.version &&
    sameInstant(existing.reviewed_at, row.reviewed_at ?? null) &&
    sameInstant(existing.publish_at, publishAt);
  return { ok: true, action: unchanged ? "unchanged" : "update", row };
}
