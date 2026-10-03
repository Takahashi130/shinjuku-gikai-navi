import { ExternalLink } from "lucide-react";
import { SITE } from "@/config/site";
import { formatDate } from "@/lib/utils/date";
import type { ProfileSource } from "../../shared/utils/profile-sources";

/** 議員の一覧の下に置く、数え方・出典・免責の注記。 */
export function MembersPageNote({
  questionsSince,
  sources,
}: {
  questionsSince: { sessionTitle: string; askedOn: string } | null;
  sources: ProfileSource[];
}) {
  return (
    <section
      aria-labelledby="members-note-title"
      className="flex flex-col gap-3 rounded-md bg-white p-4 text-xs leading-relaxed text-mirai-text-note"
    >
      <h2 id="members-note-title" className="text-sm font-bold text-mirai-text">
        このページについて
      </h2>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>区の公開資料をもとに作成。ランキングはしていません。</li>
        <li>
          {questionsSince
            ? `本会議の質問の回数は、${questionsSince.sessionTitle}（${formatDate(questionsSince.askedOn)}）以降の代表質問・一般質問を、区の「質問者・質問内容一覧」から数えています。委員会での質問は含みません。`
            : "本会議の質問の回数は、区の「質問者・質問内容一覧」から数えています。委員会での質問は含みません。"}
        </li>
        <li>
          並び順は議席番号順と五十音順だけです。質問の回数などで順位を付けることはしていません。
        </li>
        <li>
          顔写真は載せず、名前の頭文字で表しています。住所・電話番号・メールアドレスは載せていません。
        </li>
        <li>
          {`${SITE.NAME}は新宿区・新宿区議会の公式サービスではありません。正確な情報は区の公式ページでご確認ください。`}
        </li>
      </ul>

      {sources.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-mirai-text">出典</h3>
          <SourceLinks sources={sources} />
        </div>
      )}
    </section>
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
            className="inline-flex min-h-9 items-center gap-1 text-xs text-brand-link hover:text-brand-link-hover hover:underline"
          >
            {`新宿区「${source.label}」のページ`}
            <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">（新しいタブで開きます）</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
