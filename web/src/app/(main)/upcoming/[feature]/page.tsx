import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/config/site";
import { UpcomingFeaturePage } from "@/features/upcoming/server/components/upcoming-feature-page";
import {
  isUpcomingFeatureId,
  UPCOMING_FEATURE_IDS,
  UPCOMING_FEATURES,
} from "@/features/upcoming/shared/utils/upcoming-features";

type Props = {
  params: Promise<{ feature: string }>;
};

// 準備中の機能の説明ページは決まった数だけ。それ以外の URL は 404 にする。
export const dynamicParams = false;

export function generateStaticParams() {
  return UPCOMING_FEATURE_IDS.map((feature) => ({ feature }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { feature } = await params;
  if (!isUpcomingFeatureId(feature)) return {};

  const { title, lead } = UPCOMING_FEATURES[feature];
  return {
    title: `${title}（準備中） | ${SITE.NAME}`,
    description: lead,
  };
}

export default async function UpcomingPage({ params }: Props) {
  const { feature } = await params;
  if (!isUpcomingFeatureId(feature)) {
    notFound();
  }

  return <UpcomingFeaturePage featureId={feature} />;
}
