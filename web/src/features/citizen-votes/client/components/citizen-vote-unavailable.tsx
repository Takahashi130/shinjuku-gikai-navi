import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitizenVoteUnavailableProps {
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

/**
 * 区民投票の情報を読み込めなかったときの「区民の意思」の面。
 * 準備中ではない（機能はある）ので、準備中の説明は出さない。
 */
export function CitizenVoteUnavailable({
  headingLevel: Heading = "h3",
  className,
}: CitizenVoteUnavailableProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-2xl border border-line-soft bg-white p-5",
        className
      )}
    >
      <Heading className="flex items-center gap-1.5 text-sm font-bold text-mirai-text">
        <Users className="size-4 text-mirai-text-muted" aria-hidden />
        区民の意思（区民投票）
      </Heading>
      <p className="text-sm leading-relaxed text-mirai-text-secondary">
        区民投票の情報を読み込めませんでした。時間をおいて、ページを開き直してください。
      </p>
    </div>
  );
}
