import {
  explainerBodySchema,
  explainerSourceSchema,
} from "@mirai-gikai/shared/bill-explainer/schema";
import { z } from "zod";
import type { BillExplainer } from "../types";

/** bill_explainers から読む列 */
export type BillExplainerRow = {
  bill_id: string;
  status: string;
  body: unknown;
  sources: unknown;
  version: number;
  reviewed_at: string | null;
  reviewed_by: string | null;
  generated_by: string | null;
  publish_at: string | null;
  first_published_at: string | null;
  updated_at: string;
  source_path: string | null;
};

const sourcesSchema = z.array(explainerSourceSchema).min(1);

/**
 * DB の行（jsonb の body / sources）を検査して、画面用の形にする。
 * 形が壊れていれば null（壊れた解説は出さない）。
 * 本文の出典 id が sources にあるかも確かめる。
 */
export function parseExplainerRow(
  row: BillExplainerRow,
  options: { isDraft: boolean }
): BillExplainer | null {
  const body = explainerBodySchema.safeParse(row.body);
  const sources = sourcesSchema.safeParse(row.sources);
  if (!body.success || !sources.success) return null;

  const ids = new Set(sources.data.map((s) => s.id));
  const refs = [
    ...body.data.purpose.sourceRefs,
    ...body.data.background.flatMap((i) => i.sourceRefs),
    ...body.data.merits.flatMap((i) => i.sourceRefs),
    ...body.data.concerns.flatMap((i) => i.sourceRefs),
    ...body.data.keyFacts.flatMap((f) => f.sourceRefs),
  ];
  if (refs.some((ref) => !ids.has(ref))) return null;

  return {
    billId: row.bill_id,
    version: row.version,
    body: body.data,
    sources: sources.data,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    generatedBy: row.generated_by,
    firstPublishedAt: row.first_published_at,
    updatedAt: row.updated_at,
    sourcePath: row.source_path,
    isDraft: options.isDraft,
  };
}
