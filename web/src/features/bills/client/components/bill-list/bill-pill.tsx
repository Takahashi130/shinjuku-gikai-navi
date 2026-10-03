/**
 * 議案に添える補足のピル。
 *
 * 「AIインタビュー受付中」や回答数のように、タグ（BillTag）とは別系統の
 * 補足情報を並べるために使う。同じクラス文字列が複数回出るのを防ぐ。
 */
export function BillPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-sm bg-brand-accent-tint px-2 py-0.5 text-xs font-medium text-brand-link">
      {children}
    </span>
  );
}
