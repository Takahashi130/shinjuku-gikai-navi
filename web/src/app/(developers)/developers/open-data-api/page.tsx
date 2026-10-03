import type { Metadata } from "next";
import { OpenDataApiReference } from "@/features/open-data/client/components/open-data-api-reference";

export const metadata: Metadata = {
  title: "オープンデータAPI | 新宿区議会ナビ",
  description:
    "新宿区議会ナビのAIインタビューデータをオープンデータとして取得できるAPIのリファレンスです。",
};

export default function OpenDataApiPage() {
  return <OpenDataApiReference />;
}
