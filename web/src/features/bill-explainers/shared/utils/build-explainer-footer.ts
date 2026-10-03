import { formatJstDate } from "@/features/citizen-votes/shared/utils/format-vote-deadline";
import type { BillExplainer, ExplainerFooterInfo } from "../types";
import {
  buildExplainerAttribution,
  EXPLAINER_CORRECTION,
  explainerSourceFileUrl,
} from "./explainer-attribution";

/** 解説の下に出す、作成・照合・版・元ファイルの表示を作る */
export function buildExplainerFooter(
  explainer: Pick<
    BillExplainer,
    "isDraft" | "reviewedBy" | "reviewedAt" | "version" | "sourcePath"
  >,
  now: Date
): ExplainerFooterInfo {
  const attribution = buildExplainerAttribution({
    reviewedBy: explainer.reviewedBy,
    isDraft: explainer.isDraft,
  });
  const reviewedDate =
    !explainer.isDraft && explainer.reviewedAt
      ? formatJstDate(explainer.reviewedAt, now)
      : "";
  let versionLabel = `第${explainer.version}版`;
  if (explainer.isDraft) versionLabel += "（下書き）";
  else if (reviewedDate) versionLabel += `・${reviewedDate}照合`;

  return {
    isDraft: explainer.isDraft,
    badge: attribution.badge,
    attributionText: attribution.text,
    correction: { ...EXPLAINER_CORRECTION },
    versionLabel,
    sourceFileUrl: explainerSourceFileUrl(explainer.sourcePath),
  };
}
