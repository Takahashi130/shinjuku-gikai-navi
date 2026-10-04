"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CAST_VOTE_SECTION_ID } from "../../shared/utils/bill-vote-href";
import { useKeepHashTargetInView } from "../hooks/use-keep-hash-target-in-view";

/**
 * 「あなたの意思を投じる」の帯へのリンク（#cast-vote・billVoteHref）の行き先。
 *
 * 帯のデータは Suspense の中で読み込むので、id を帯そのものに付けると、
 * ページを開いた時点（読み込み中の骨組みだけの時点）では行き先が無く、
 * 新しいタブ・再読み込み・共有されたリンクで帯まで移動しない。そこで、
 * 読み込みの前後どちらでも描く外側（骨組みも中に入る）にこの id を付ける。
 * 上の事前解説などが後から読み込まれて帯が下へずれても、利用者が動かすまでは
 * 帯を画面の上に保つ（useKeepHashTargetInView）。
 */
export function CastVoteAnchor({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  useKeepHashTargetInView(CAST_VOTE_SECTION_ID);
  return (
    <div id={CAST_VOTE_SECTION_ID} className={cn("scroll-mt-24", className)}>
      {children}
    </div>
  );
}
