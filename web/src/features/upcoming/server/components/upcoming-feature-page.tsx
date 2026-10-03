import "server-only";

import { ArrowRight, CircleDashed, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { LabelPill } from "@/components/ui/label-pill";
import { RoundCard } from "@/components/ui/round-card";
import { routes } from "@/lib/routes";
import { UPCOMING_FEATURE_ICONS } from "../../shared/utils/upcoming-feature-icons";
import {
  UPCOMING_FEATURES,
  type UpcomingFeatureId,
  type UpcomingFeatureLink,
} from "../../shared/utils/upcoming-features";

/**
 * まだ無い機能の説明ページ（/upcoming/[feature]）。ヘッダーのタブから来る。
 *
 * 何をする予定なのかを文で書き、いま代わりに見られる実在のページ（議案一覧や
 * 区の公式ページ）へのリンクを添える。押せそうで押せないボタンは置かない。
 */
export function UpcomingFeaturePage({
  featureId,
}: {
  featureId: UpcomingFeatureId;
}) {
  const feature = UPCOMING_FEATURES[featureId];
  const Icon = UPCOMING_FEATURE_ICONS[featureId];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:py-10">
      <Breadcrumb
        items={[
          { label: "トップ", href: routes.home() },
          { label: feature.title },
        ]}
      />

      <RoundCard padding="lg" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <LabelPill tone="neutral" size="md">
            <CircleDashed aria-hidden />
            準備中の機能
          </LabelPill>
          <h1 className="flex items-center gap-3 break-phrase text-3xl font-extrabold tracking-tight text-mirai-text md:text-4xl">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-mirai-surface text-mirai-text-secondary">
              <Icon className="size-6" aria-hidden />
            </span>
            {feature.title}
          </h1>
          <p className="text-base leading-relaxed text-mirai-text-secondary">
            {feature.lead}
          </p>
        </div>

        <ComingSoonCard
          icon={Icon}
          radius="md"
          headingLevel="h2"
          title="予定していること"
          description="まだ使えません。できあがったら、ヘッダーのタブからこのページで使えるようにします。"
          points={feature.points}
        />
      </RoundCard>

      {feature.links.length > 0 && (
        <RoundCard asChild className="flex flex-col gap-3">
          <section aria-labelledby="upcoming-links-title">
            <h2
              id="upcoming-links-title"
              className="text-lg font-extrabold text-mirai-text"
            >
              いま見られるもの
            </h2>
            <ul className="flex flex-col divide-y divide-line-soft">
              {feature.links.map((link) => (
                <li key={link.href}>
                  <UpcomingLink link={link} />
                </li>
              ))}
            </ul>
          </section>
        </RoundCard>
      )}
    </div>
  );
}

function UpcomingLink({ link }: { link: UpcomingFeatureLink }) {
  const label = (
    <span className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-[15px] font-bold text-brand-link group-hover:underline">
        {link.label}
        {link.kind === "external" ? (
          <ExternalLink className="size-3.5" aria-hidden />
        ) : (
          <ArrowRight className="size-4" aria-hidden />
        )}
      </span>
      {link.note && (
        <span className="text-sm text-mirai-text-secondary">{link.note}</span>
      )}
    </span>
  );

  if (link.kind === "external") {
    return (
      <Link
        href={link.href as Route}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-h-11 py-3"
      >
        {label}
        <span className="sr-only">（新しいタブで開きます）</span>
      </Link>
    );
  }

  return (
    <Link href={link.href} className="group flex min-h-11 py-3">
      {label}
    </Link>
  );
}
