import type { ReactNode } from "react";
import { AuthGate } from "@/components/layouts/auth-gate";

/**
 * AIインタビューは回答者を匿名ユーザーとして識別するため、
 * インタビュー関連のページでだけ匿名ログインを行う。
 */
export default function InterviewLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <AuthGate />
      {children}
    </>
  );
}
