import { notFound } from "next/navigation";
import { SITE } from "@/config/site";
import { DietSessionBillsPage } from "@/features/diet-sessions/server/components/diet-session-bills-page";
import { getDietSessionBySlug } from "@/features/diet-sessions/server/loaders/get-diet-session-by-slug";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const session = await getDietSessionBySlug(slug);

  if (!session) {
    return { title: "会期が見つかりません" };
  }

  return {
    title: `${session.name}の議案一覧 | ${SITE.NAME}`,
    description: `${session.name}（${session.start_date}〜${session.end_date}）に提出された議案の一覧です。`,
  };
}

export default async function DietSessionBillsRoute({ params }: Props) {
  const { slug } = await params;
  const session = await getDietSessionBySlug(slug);

  if (!session) {
    notFound();
  }

  return <DietSessionBillsPage session={session} />;
}
