import { cn } from "@/lib/utils";

interface ParticipationSkeletonProps {
  /** 読み込んでいるもの（例：事前解説）。読み上げに使う */
  label: string;
  /** dark は「あなたの意思を投じる」の濃色の帯の位置 */
  tone?: "light" | "dark";
  className?: string;
}

/**
 * 解説・区民投票を読み込んでいるあいだの仮の面。読み込んだあとの面と同じ角丸に
 * して、差し替わったときに大きく動かないようにする。
 */
export function ParticipationSkeleton({
  label,
  tone = "light",
  className,
}: ParticipationSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={`${label}を読み込んでいます`}
      className={cn(
        "animate-pulse rounded-2xl",
        tone === "dark" ? "h-48 bg-brand-header" : "h-40 bg-mirai-surface",
        className
      )}
    />
  );
}
