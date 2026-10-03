import { formatJstDateTime } from "@/features/citizen-votes/shared/utils/format-vote-deadline";
import type { BillExplainerView } from "../types";

export type ExplainerAbsenceMessage = {
  title: string;
  detail: string;
};

/** 解説を出せない理由を、議案ページに出す文にする */
export function explainerAbsenceMessage(
  view: Extract<BillExplainerView, { kind: "absent" }>,
  now: Date
): ExplainerAbsenceMessage {
  const { readiness, hasDraft } = view;
  switch (readiness.state) {
    case "not_applicable":
      return {
        title: "人事案件のため、解説の対象外です",
        detail:
          "特定の人の任命などへの同意・意見を求める議案は、解説と投票の対象にしていません。",
      };
    case "not_available":
      return readiness.reason === "withdrawn"
        ? {
            title: "この議案の解説は取り下げました",
            detail: "内容を見直しているため、解説の公開をやめています。",
          }
        : {
            title: "この議案の解説はありません",
            detail:
              "解説は、採決の前に区の公開資料がそろった議案から作成しています。この議案は対象になっていません。",
          };
    case "scheduled":
      return {
        title: `解説は ${formatJstDateTime(readiness.publishAt, now)} に公開します`,
        detail: "資料との照合は済んでいます。公開まで少しお待ちください。",
      };
    case "preparing":
      if (hasDraft) {
        return {
          title: "解説を準備しています",
          detail: readiness.afterVote
            ? "採決には間に合いませんでしたが、資料との照合が済みしだい公開します。"
            : "資料との照合が済みしだい公開します。",
        };
      }
      return {
        title: "この議案の解説はまだありません",
        detail:
          "解説は、区の公開資料がそろった議案から順に作成しています。採決に間に合わないときは、採決のあとに公開することがあります。",
      };
  }
}
