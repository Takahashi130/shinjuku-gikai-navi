import { BookOpen, ExternalLink } from "lucide-react";
import { RoundCard } from "@/components/ui/round-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { SITE } from "@/config/site";
import { formatDate } from "@/lib/utils/date";
import type { ProfileSource } from "../../shared/utils/profile-sources";
import { PRESIDING_OFFICER_QUESTION_NOTE } from "../../shared/utils/term-label";

/** 議員の一覧・議員のページの両方に出す注記。 */
export const RANKING_NOTE =
  "区の公開資料をもとに作成。ランキングはしていません。";

/** 議員の一覧の下に置く、数え方・出典・免責の注記。 */
export function MembersPageNote({
  term,
  sources,
}: {
  /** 今の任期（質問の回数を数え始めた日） */
  term: { termNumber: number; termStart: string } | null;
  sources: ProfileSource[];
}) {
  return (
    <RoundCard asChild className="flex flex-col gap-4">
      <section aria-labelledby="members-note-title">
        <SectionHeading
          id="members-note-title"
          title="このページについて"
          icon={BookOpen}
        />
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-mirai-text-secondary">
          <li>{RANKING_NOTE}</li>
          <li>
            {term
              ? `カードの本会議の質問の回数は、全員同じ期間（今の任期・第${term.termNumber}期の始まりの${formatDate(term.termStart)}から）の代表質問・一般質問を、区の「質問者・質問内容一覧」から数えています。前の任期からの合計は、議員のページに載せています。委員会での質問は含みません。`
              : "本会議の質問の回数は、区の「質問者・質問内容一覧」から数えています。委員会での質問は含みません。"}
          </li>
          <li>
            {`代表質問は会派を代表して行う質問です。${PRESIDING_OFFICER_QUESTION_NOTE}`}
          </li>
          <li>
            政務活動費は会派に交付され、区は会派ごとの収支を公表しています。カードの金額は、所属会派のいちばん新しい年度の支出合計を人数（年度の途中で人数が変わった会派は、交付額から出した平均の人数）で割った「目安」で、区が公表した議員1人ひとりの金額ではありません。
          </li>
          <li>
            並び順は議席番号順と五十音順だけです。質問の回数や金額で順位を付けることはしていません。
          </li>
          <li>
            顔写真は載せず、名前の頭文字で表しています。住所・電話番号・メールアドレスは載せていません。
          </li>
          <li>
            {`${SITE.NAME}は新宿区・新宿区議会の公式サービスではありません。正確な情報は区の公式ページでご確認ください。`}
          </li>
        </ul>

        {sources.length > 0 && (
          <div className="flex flex-col gap-1 border-line-soft border-t pt-4">
            <h3 className="text-sm font-bold text-mirai-text">出典</h3>
            <SourceLinks sources={sources} />
          </div>
        )}
      </section>
    </RoundCard>
  );
}

/** 区の HTML ページへのリンクの列（新しいタブで開く）。 */
export function SourceLinks({ sources }: { sources: ProfileSource[] }) {
  return (
    <ul className="flex flex-col">
      {sources.map((source) => (
        <li key={source.url}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 text-sm text-brand-link hover:text-brand-link-hover hover:underline"
          >
            {`新宿区「${source.label}」のページ`}
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            <span className="sr-only">（新しいタブで開きます）</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
