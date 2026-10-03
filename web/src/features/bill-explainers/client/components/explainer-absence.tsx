import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExplainerAbsenceMessage } from "../../shared/utils/explainer-absence-message";

interface ExplainerAbsenceProps {
  message: ExplainerAbsenceMessage;
  className?: string;
}

/** 解説が無い議案に、その理由（準備中・人事案件・過去の議案など）を出す */
export function ExplainerAbsence({
  message,
  className,
}: ExplainerAbsenceProps) {
  return (
    <section
      aria-labelledby="bill-explainer-heading"
      className={cn(
        "space-y-1 rounded-xl border border-dashed bg-card p-4",
        className
      )}
    >
      <h2
        id="bill-explainer-heading"
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground"
      >
        <BookOpen className="size-4" aria-hidden="true" />
        この議案の解説
      </h2>
      <p className="font-bold">{message.title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {message.detail}
      </p>
    </section>
  );
}
