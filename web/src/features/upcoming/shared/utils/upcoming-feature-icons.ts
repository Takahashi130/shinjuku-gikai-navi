import { ChartLine, type LucideIcon, Video } from "lucide-react";
import type { UpcomingFeatureId } from "./upcoming-features";

/** 準備中の機能の目印。ヘッダーのタブと説明ページで同じものを使う。 */
export const UPCOMING_FEATURE_ICONS: Record<UpcomingFeatureId, LucideIcon> = {
  live: Video,
  impact: ChartLine,
};
