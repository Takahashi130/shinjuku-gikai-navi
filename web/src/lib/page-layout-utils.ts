/**
 * ページレイアウトに関するユーティリティ
 *
 * TOP・議案一覧・議案詳細を「メインページ」として扱い、
 * DifficultySelectorを表示する
 */

/** メインページ（TOP、議案一覧、議案詳細）かどうかを判定 */
export function isMainPage(pathname: string): boolean {
  // トップページ
  if (pathname === "/") return true;
  // 議案一覧ページ
  if (pathname === "/bills") return true;
  // 議案詳細ページ（/bills/[id]）- サブパスは除外
  if (/\/bills\/[^/]+$/.test(pathname)) return true;
  return false;
}

/** インタビューチャットページかどうかを判定 */
export function isInterviewPage(pathname: string): boolean {
  // /bills/[id]/interview/chat
  return /\/bills\/[^/]+\/interview\/chat$/.test(pathname);
}

/** インタビューセクション（LP・チャット含む）かどうかを判定 */
export function isInterviewSection(pathname: string): boolean {
  // /bills/[id]/interview 以下すべて
  return /\/bills\/[^/]+\/interview(\/|$)/.test(pathname);
}

/** インタビューページからbillIdを抽出 */
export function extractBillIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/bills\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * メイン領域の組み方。
 *
 * - wide: 画面幅いっぱいに使うページ（トップ・議案一覧・議案詳細・会期別一覧・
 *   議員の一覧と議員のページ・規約（LegalPageLayout を使うページ）・準備中の機能の説明）。
 *   各ページが自分で最大幅を決める
 * - narrow: 従来の1カラム（最大700px）のページ。インタビュー・意見・レポートなど、
 *   スマホの縦長の画面を前提に作られているもの
 * - interview-chat: インタビューのチャット。画面の高さに収め、入力欄を下に固定する
 */
export type MainLayoutKind = "wide" | "narrow" | "interview-chat";

const WIDE_PAGE_PATTERNS: readonly RegExp[] = [
  /^\/$/,
  /^\/bills$/,
  /^\/bills\/[^/]+$/,
  /^\/preview\/bills\/[^/]+$/,
  /^\/kokkai\/[^/]+\/bills$/,
  /^\/members$/,
  /^\/members\/[^/]+$/,
  /^\/terms$/,
  /^\/privacy$/,
  /^\/developers\/interview-data-terms$/,
  /^\/upcoming\/[^/]+$/,
];

/** パスからメイン領域の組み方を決める。知らないページは従来どおり narrow にする。 */
export function getMainLayoutKind(pathname: string): MainLayoutKind {
  if (isInterviewPage(pathname)) return "interview-chat";
  return WIDE_PAGE_PATTERNS.some((pattern) => pattern.test(pathname))
    ? "wide"
    : "narrow";
}
