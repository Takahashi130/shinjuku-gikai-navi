import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/config/site";
import { MemberProfilePage } from "@/features/members/server/components/member-profile-page";
import { getMemberProfile } from "@/features/members/server/loaders/get-member-profile";
import { routes } from "@/lib/routes";

interface MemberDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: MemberDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getMemberProfile(id);

  if (!profile) {
    return { title: "議員が見つかりません" };
  }

  const { member, faction } = profile;
  const title = faction ? `${member.name}（${faction.name}）` : member.name;

  return {
    title: `${title} | 議員 | ${SITE.NAME}`,
    description: `新宿区議会議員 ${member.name}さんの会派・委員会、本会議の質問、所属会派の議案への賛否と政務活動費を、区の公開資料をもとにまとめています。`,
    alternates: {
      canonical: routes.memberDetail(member.id),
    },
  };
}

export default async function MemberDetailPage({
  params,
}: MemberDetailPageProps) {
  const { id } = await params;
  const profile = await getMemberProfile(id);

  if (!profile) {
    notFound();
  }

  return <MemberProfilePage profile={profile} />;
}
