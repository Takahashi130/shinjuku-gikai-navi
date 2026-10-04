import { routes } from "@/lib/routes";

/** 議案ページの「あなたの意思を投じる」の帯の id（ページ内リンクの行き先） */
export const CAST_VOTE_SECTION_ID = "cast-vote";

/** 同じページの中で「あなたの意思を投じる」へ送るリンク */
export const CAST_VOTE_ANCHOR = `#${CAST_VOTE_SECTION_ID}` as const;

/**
 * ほかのページ（トップ・一覧など）から、議案ページの投票の帯へ送るリンク。
 * 例：/bills/xxx#cast-vote
 */
export function billVoteHref(billId: string) {
  return `${routes.billDetail(billId)}${CAST_VOTE_ANCHOR}` as const;
}
