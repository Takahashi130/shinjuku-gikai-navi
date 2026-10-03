import { cn } from "@/lib/utils";
import { getMemberInitial } from "../../shared/utils/member-initial";

const SIZES = {
  md: "size-14 text-2xl",
  lg: "size-24 text-4xl md:size-32 md:text-5xl",
} as const;

/**
 * 顔写真の代わりの頭文字のアイコン。全員を同じ色・同じ形で出す
 * （会派や数で色を変えない）。
 *
 * 名前は隣に文字で出しているので、読み上げからは外す。ふりがな表示が ON の
 * とき Rubyful が頭文字にもふりがなを付けるので、アイコンの中では隠す。
 */
export function MemberInitialIcon({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full border border-brand-accent-light bg-brand-accent-tint font-bold leading-none text-brand-link [&_rt]:hidden",
        SIZES[size],
        className
      )}
    >
      {getMemberInitial(name)}
    </div>
  );
}
