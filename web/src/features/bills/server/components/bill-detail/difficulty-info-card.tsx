import { BookOpenText } from "lucide-react";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";

/**
 * 解説の途中（最後の見出しの手前）に差し込む、説明の詳しさの切り替え。
 * lib/markdown の rehypeInjectElement から差し込まれる。
 */
export async function DifficultyInfoCard() {
  const level = await getDifficultyLevel();
  return (
    <div className="my-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mirai-surface px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-bold text-mirai-text">
        <BookOpenText className="size-5 shrink-0 text-brand-link" aria-hidden />
        説明の詳しさをいつでも切り替えられます
      </p>
      <DifficultySelector currentLevel={level} maintainScrollFromBottom />
    </div>
  );
}
