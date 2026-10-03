import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { BillsListPage } from "@/features/bills/server/components/bills-list-page";
import type { BillsListSearchParams } from "@/features/bills/shared/utils/parse-bills-list-params";

export const metadata: Metadata = {
  title: `議案をさがす | ${SITE.NAME}`,
  description:
    "新宿区議会に提出された議案を、会期や審議結果から探せます。気になる議案にはAIインタビューで意見を届けられます。",
};

type Props = {
  searchParams: Promise<BillsListSearchParams>;
};

export default async function BillsPage({ searchParams }: Props) {
  return <BillsListPage searchParams={await searchParams} />;
}
