import { cn } from "@/lib/utils";

interface ComingSoonTagProps {
  /** 濃色の帯の上に置くときは dark */
  tone?: "light" | "dark";
  className?: string;
}

/**
 * まだ無い機能に添える「準備中」の印。
 *
 * 存在しない機能を押せそうに見せないため、準備中の項目はリンクやボタンにせず、
 * この印を添えた文字として出す。
 */
export function ComingSoonTag({
  tone = "light",
  className,
}: ComingSoonTagProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm px-1.5 py-px text-[11px] font-bold leading-4",
        tone === "dark"
          ? "bg-brand-header-hover text-brand-on-header"
          : "bg-mirai-surface-muted text-mirai-text-secondary",
        className
      )}
    >
      準備中
    </span>
  );
}
