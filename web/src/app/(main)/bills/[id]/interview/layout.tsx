import type { ReactNode } from "react";

/**
 * AIインタビューは回答者を匿名ユーザーとして識別するため、匿名ログイン（AuthGate）を行う。
 * ただし AuthGate はここ（layout）には置かず、各ページで議案とインタビューの設定が
 * 見つかったときだけ描画する。存在しない議案の URL（notFound）では匿名ユーザーを作らない。
 */
export default function InterviewLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
