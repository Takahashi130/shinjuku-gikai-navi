import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HomeGreenBandProps {
  title: string;
  description: string;
  /** 白い塗りのボタン（主な行き先）と、濃い緑のボタン（ほかの行き先）。 */
  links: readonly { href: Route; label: string }[];
  /** center は見出しとボタンを中央にそろえる（ページの最後に置く大きな帯）。 */
  align?: "start" | "center";
  className?: string;
}

/**
 * トップの緑の帯。区民投票や議案一覧へ誘う。
 *
 * 白い文字を載せるので、地は濃いめの緑（brand-band）にし、文字は太字にする。
 */
export function HomeGreenBand({
  title,
  description,
  links,
  align = "start",
  className,
}: HomeGreenBandProps) {
  const center = align === "center";

  return (
    <section
      data-surface="dark"
      className={cn(
        "flex flex-col gap-4 rounded-3xl bg-brand-band px-6 py-6 text-white shadow-md md:px-8 md:py-7",
        center
          ? "items-center text-center"
          : "md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-extrabold leading-snug md:text-xl">
          {title}
        </h2>
        <p className="max-w-2xl text-sm font-bold leading-relaxed text-white/90">
          {description}
        </p>
      </div>
      <div
        className={cn(
          "flex flex-wrap gap-3",
          center ? "justify-center" : "shrink-0"
        )}
      >
        {links.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex min-h-11 items-center gap-1 rounded-full px-5 text-sm font-bold shadow-sm",
              index === 0
                ? "bg-white text-brand-link hover:bg-brand-accent-tint"
                : "border border-white/30 bg-brand-link text-white hover:bg-brand-link-hover"
            )}
          >
            {link.label}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
