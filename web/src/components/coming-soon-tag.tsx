import { cn } from "@/lib/utils";

interface ComingSoonTagProps {
  /** 濃色の帯の上に置くときは dark */
  tone?: "light" | "dark";
  className?: string;
}

/**
 * まだ無い機能に添える「準備中」の印。
 *
 * 準備中の機能そのものを押せるように見せない（その機能のボタンや、押しても
 * 何も起きないリンクは作らない）。実在する説明ページ（/upcoming/[feature]）
 * へのリンクや、準備中の説明カードの見出しに添えるのはよい。
 *
 * 読み上げでは前の語と続けて読まれない（「議会LIVE中継準備中」にならない）
 * よう、括弧で区切った文字を別に持つ。
 */
export function ComingSoonTag({
  tone = "light",
  className,
}: ComingSoonTagProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-px text-xs font-bold leading-4",
        tone === "dark"
          ? "bg-brand-header-hover text-brand-on-header"
          : "bg-mirai-surface-muted text-mirai-text-secondary",
        className
      )}
    >
      <span aria-hidden>準備中</span>
      <span className="sr-only">（準備中）</span>
    </span>
  );
}
