import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExplainerAbsenceMessage } from "../../shared/utils/explainer-absence-message";
import { ExplainerHeading } from "./explainer-heading";

interface ExplainerAbsenceProps {
  message: ExplainerAbsenceMessage;
  className?: string;
}

/**
 * 解説が無い議案に、その理由（準備中・人事案件・過去の議案など）を出す。
 * 実データの面と見分けられるよう、枠は破線にする（ComingSoonCard と同じ）。
 */
export function ExplainerAbsence({
  message,
  className,
}: ExplainerAbsenceProps) {
  return (
    <section
      aria-labelledby="bill-explainer-heading"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-dashed border-mirai-border bg-white p-4 sm:p-5",
        className
      )}
    >
      <ExplainerHeading icon={BookOpen} />
      <div className="flex flex-col gap-1 rounded-xl bg-mirai-surface px-4 py-3">
        <p className="text-base font-bold leading-snug text-mirai-text">
          {message.title}
        </p>
        <p className="text-sm leading-relaxed text-mirai-text-secondary">
          {message.detail}
        </p>
      </div>
    </section>
  );
}
