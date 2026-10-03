import {
  type ExplainerPublication,
  explainerReadiness,
  isPersonnelBill,
} from "@mirai-gikai/shared/bill-explainer/explainer-readiness";
import type { ExplainerStatus } from "@mirai-gikai/shared/bill-explainer/schema";
import type { BillExplainerView } from "../types";
import {
  type BillExplainerRow,
  parseExplainerRow,
} from "./parse-explainer-row";

function toStatus(status: string): ExplainerStatus | null {
  return status === "draft" || status === "published" || status === "withdrawn"
    ? status
    : null;
}

export function toExplainerPublication(row: {
  status: string;
  reviewed_at: string | null;
  publish_at: string | null;
}): ExplainerPublication | null {
  const status = toStatus(row.status);
  if (!status) return null;
  return { status, reviewedAt: row.reviewed_at, publishAt: row.publish_at };
}

/**
 * 解説を出すか、出さないならその理由を決める（キャッシュの外で現在時刻と比べる）。
 *
 * - 公開の条件は共通の explainerReadiness（published・照合済み・予約公開の日時を過ぎた）
 * - includeDraft（トークン付きのプレビュー）では、取り下げ以外の下書きも出す
 * - 本文が壊れていれば出さず、「準備中」として扱う
 */
export function resolveExplainerView(input: {
  billSlug: string | null;
  /** 議案名（人事案件を見分ける） */
  billName: string | null;
  voteAt: string | null;
  row: BillExplainerRow | null;
  now: Date;
  includeDraft?: boolean;
}): BillExplainerView {
  const { billSlug, billName, voteAt, row, now } = input;
  const publication = row ? toExplainerPublication(row) : null;
  const readiness = explainerReadiness({
    billSlug,
    billName,
    explainer: publication,
    voteAt,
    now,
  });
  const hasDraft = publication !== null && publication.status !== "withdrawn";

  if (readiness.state === "available" && row) {
    const explainer = parseExplainerRow(row, { isDraft: false });
    if (explainer) return { kind: "available", explainer };
    const voteTime = voteAt ? new Date(voteAt).getTime() : Number.NaN;
    return {
      kind: "absent",
      readiness: {
        state: "preparing",
        afterVote: Number.isNaN(voteTime) || voteTime <= now.getTime(),
      },
      hasDraft: true,
    };
  }

  if (
    input.includeDraft &&
    row &&
    hasDraft &&
    !isPersonnelBill({ slug: billSlug, name: billName })
  ) {
    const explainer = parseExplainerRow(row, { isDraft: true });
    if (explainer) return { kind: "available", explainer };
  }

  if (readiness.state === "available") {
    // row が無いのに available にはならないが、型のために「準備中」に倒す
    return {
      kind: "absent",
      readiness: { state: "preparing", afterVote: false },
      hasDraft,
    };
  }
  return { kind: "absent", readiness, hasDraft };
}
