import { AI_CROSSCHECK_REVIEWER } from "@mirai-gikai/shared/bill-explainer/schema";
import { EXTERNAL_LINKS } from "@/config/external-links";

/** 誤りの知らせ先（解説の元ファイルも公開リポジトリにある） */
export const EXPLAINER_CORRECTION_URL = `${EXTERNAL_LINKS.GITHUB_REPO}/issues`;

/** 解説の元ファイルを見る URL（公開リポジトリの既定ブランチ） */
export function explainerSourceFileUrl(
  sourcePath: string | null
): string | null {
  if (!sourcePath || !/^explainers\/[\w./-]+\.json$/.test(sourcePath)) {
    return null;
  }
  return `${EXTERNAL_LINKS.GITHUB_REPO}/blob/develop/${sourcePath}`;
}

export type ExplainerAttribution = {
  /** 見出しに添える短い印 */
  badge: string;
  /** だれが作り、だれが照合したか */
  text: string;
};

/**
 * 解説の作成・照合の表示。
 * - AI の照合（reviewed_by = ai-crosscheck）：「別のAIが資料と照合しました」
 * - それ以外（人の確認）：「運営者が資料と照合しました」
 * - 下書き：まだ照合が済んでいないことを示す
 */
export function buildExplainerAttribution(input: {
  reviewedBy: string | null;
  isDraft: boolean;
}): ExplainerAttribution {
  if (input.isDraft || !input.reviewedBy) {
    return {
      badge: "下書き・公開前",
      text: "AI（Claude）が新宿区の公開資料をもとに作成した下書きです。資料との照合が済むまで公開しません。",
    };
  }
  if (input.reviewedBy === AI_CROSSCHECK_REVIEWER) {
    return {
      badge: "AI作成・照合済み",
      text: "AI（Claude）が新宿区の公開資料をもとに作成し、別のAIが資料と照合しました。",
    };
  }
  return {
    badge: "AI作成・確認済み",
    text: "AI（Claude）が新宿区の公開資料をもとに作成し、運営者が資料と照合しました。",
  };
}

/**
 * 作成・照合の表示のすぐ後に続ける、誤りの知らせ方。
 * 画面では linkText の部分を EXPLAINER_CORRECTION_URL へのリンクにする。
 */
export const EXPLAINER_CORRECTION = {
  before: "誤りがあれば、",
  linkText: "GitHub の Issue",
  after: " でお知らせください。",
  url: EXPLAINER_CORRECTION_URL,
} as const;
export type ExplainerCorrection = typeof EXPLAINER_CORRECTION;
