import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { MembersListPage } from "@/features/members/server/components/members-list-page";
import type { MembersListSearchParams } from "@/features/members/shared/utils/members-list-params";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: `議員カルテ | ${SITE.NAME}`,
  description:
    "新宿区議会の議員を、会派・委員会・本会議の質問の回数・所属会派の政務活動費とあわせて一覧できます。区の公開資料をもとに作成しています。",
  alternates: {
    canonical: routes.membersList(),
  },
};

type Props = {
  searchParams: Promise<MembersListSearchParams>;
};

export default async function MembersPage({ searchParams }: Props) {
  return <MembersListPage searchParams={await searchParams} />;
}
