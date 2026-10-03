import { type LucideIcon, Scale, Search, Vote } from "lucide-react";
import Link from "next/link";
import { ComingSoonTag } from "@/components/coming-soon-tag";
import { SITE } from "@/config/site";
import { routes } from "@/lib/routes";
import { HomePanel } from "./home-panel";

/**
 * このサービスでできること（直接民主主義の3つの段階）。
 * まだ無い機能はリンクにせず「準備中」と添える。
 */
export function ConceptCard({ totalCount }: { totalCount: number }) {
  return (
    <HomePanel
      title={SITE.CATCHPHRASE}
      titleId="concept-title"
      subtitle={`${SITE.NAME}でできること`}
      className="h-full"
    >
      <ol className="flex flex-col gap-4">
        <Step
          icon={Search}
          step={1}
          title="議案を知る"
          text={`${totalCount}件の議案を、テーマや審議の状況から探せます。`}
        />
        <Step
          icon={Vote}
          step={2}
          title="1票で意思表示する"
          text="誰でも賛成・反対を表明できるようにします（1台につき1票）。"
          comingSoon
        />
        <Step
          icon={Scale}
          step={3}
          title="議会とのズレを見る"
          text="区民の意思と議会の議決を見比べられるようにします。"
          comingSoon
        />
      </ol>
      <Link
        href={routes.billsList()}
        className="-mb-3 mt-auto pt-4 pb-3 text-[13px] font-bold text-brand-link hover:text-brand-link-hover hover:underline"
      >
        議案をさがす
      </Link>
    </HomePanel>
  );
}

function Step({
  icon: Icon,
  step,
  title,
  text,
  comingSoon,
}: {
  icon: LucideIcon;
  step: number;
  title: string;
  text: string;
  comingSoon?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-accent-tint text-brand-link">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-mirai-text">
          <span className="sr-only">ステップ{step}：</span>
          {title}
          {comingSoon && <ComingSoonTag />}
        </p>
        <p className="text-xs leading-relaxed text-mirai-text-secondary">
          {text}
        </p>
      </div>
    </li>
  );
}
