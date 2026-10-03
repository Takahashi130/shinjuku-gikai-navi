/**
 * 本会議の代表質問・一般質問を、会期ごとの「質問者・質問内容一覧」ページから取り込む
 *
 * 使い方:
 *   pnpm --filter @mirai-gikai/shinjuku-importer questions <会期ページのURL>... [--dry-run]
 *   pnpm --filter @mirai-gikai/shinjuku-importer questions --all [--dry-run]
 *
 * 書き込むテーブル: plenary_questions（会期ごとに消してから入れ直す）、faction_memberships（作り直す）
 * 議員（members）は先に members コマンドで取り込んでおく。今の議員名簿に無い議員の質問は member_id を空にして残す。
 * 委員会での質問は数えない（会議録システムは自動取得が禁止されているため）。
 */
import { sessionSlug } from "./build-content";
import { createDb, errorMessage, revalidateWebCache, sessionUrlsFromArgs, todayInJapan } from "./cli-helpers";
import { canonicalMemberKey } from "./data/member-name-aliases";
import { createFactionResolver, type FactionResolver } from "./faction-store";
import { fetchText } from "./fetch";
import { rebuildFactionMemberships } from "./membership-store";
import { extractQuestionPageLinks, type PlenaryQuestion, parseQuestionPage } from "./parse-question-page";
import { parseSessionPage } from "./parse-session-page";

type SessionQuestions = { slug: string; title: string; questions: (PlenaryQuestion & { sourceUrl: string })[] };

async function readSessionQuestions(url: string, sinceReiwa: number): Promise<SessionQuestions | null> {
  const html = await fetchText(url);
  const session = parseSessionPage(html, url);
  if (session.reiwaYear < sinceReiwa) return null;
  const links = extractQuestionPageLinks(html, url);
  if (links.length === 0) {
    if (session.type === "regular") console.warn(`⚠️  ${session.title}: 質問者一覧のページが見つかりません`);
    return null;
  }
  const questions: SessionQuestions["questions"] = [];
  for (const link of links) {
    const { questions: parsed, skippedLines } = parseQuestionPage(await fetchText(link), session.startDate);
    for (const line of skippedLines) console.warn(`⚠️  ${session.title}: 読めなかった行「${line}」`);
    questions.push(...parsed.map((q) => ({ ...q, sourceUrl: link })));
  }
  return { slug: sessionSlug(session), title: session.title, questions };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const sinceIdx = args.indexOf("--since-reiwa");
  const sinceReiwa = sinceIdx >= 0 ? Number(args[sinceIdx + 1]) : 1;
  const db = createDb(dryRun);
  const urls = await sessionUrlsFromArgs(args);
  if (urls.length === 0) {
    console.error("会期ページの URL か --all を指定してください");
    process.exit(1);
  }

  const unresolvedFactions = new Set<string>();
  let resolveFaction: FactionResolver = () => null;
  const memberIds = new Map<string, string>();
  const sessionIds = new Map<string, string>();
  if (db) {
    resolveFaction = await createFactionResolver(db, unresolvedFactions);
    const { data: members, error } = await db.from("members").select("id, name_key");
    if (error) throw error;
    for (const m of members) memberIds.set(m.name_key, m.id);
    if (memberIds.size === 0) console.warn("⚠️  議員がまだ取り込まれていません（先に members を実行してください）");
    const { data: sessions, error: sessionError } = await db.from("diet_sessions").select("id, slug");
    if (sessionError) throw sessionError;
    for (const s of sessions) if (s.slug) sessionIds.set(s.slug, s.id);
  }

  let total = 0;
  const dates: string[] = [];
  const failures: string[] = [];
  const formerSpeakers = new Map<string, number>();
  let consecutiveOld = 0;
  for (const url of urls) {
    if (consecutiveOld >= 3) {
      console.log("⏹️  平成の会期に達したため終了します");
      break;
    }
    try {
      const result = await readSessionQuestions(url, sinceReiwa);
      consecutiveOld = 0;
      if (!result) continue;
      if (result.questions.length === 0) {
        console.warn(`⚠️  ${result.title}: 質問を読み取れませんでした（書き換えません）`);
        failures.push(url);
        continue;
      }
      const rows = result.questions.map((q, k) => {
        const memberId = memberIds.get(canonicalMemberKey(q.speakerName)) ?? null;
        if (db && !memberId) formerSpeakers.set(q.speakerName, (formerSpeakers.get(q.speakerName) ?? 0) + 1);
        return {
          diet_session_id: sessionIds.get(result.slug) ?? null,
          session_slug: result.slug,
          session_title: result.title,
          question_type: q.questionType,
          asked_on: q.askedOn,
          member_id: memberId,
          speaker_name: q.speakerName,
          faction_name: q.factionName,
          faction_id: q.factionName ? resolveFaction(q.factionName) : null,
          answer_style: q.answerStyle,
          topics: q.topics,
          topic_count: q.topics.length,
          sort_order: k,
          source_url: q.sourceUrl,
        };
      });
      if (db) {
        const { error: deleteError } = await db.from("plenary_questions").delete().eq("session_slug", result.slug);
        if (deleteError) throw deleteError;
        const { error } = await db.from("plenary_questions").insert(rows);
        if (error) throw error;
      }
      total += rows.length;
      dates.push(...rows.map((r) => r.asked_on));
      const rep = rows.filter((r) => r.question_type === "representative").length;
      console.log(`✅ ${result.title}: 代表質問 ${rep} 人・一般質問 ${rows.length - rep} 人`);
    } catch (e) {
      const message = errorMessage(e);
      if (message.startsWith("会期名")) {
        consecutiveOld++;
        continue;
      }
      console.error(`❌ ${url}: ${message}`);
      failures.push(url);
    }
  }

  dates.sort();
  console.log(
    `\n🎉 質問 ${total} 件${dryRun ? "（確認のみ）" : "を取り込みました"}（${dates[0] ?? "-"}〜${dates[dates.length - 1] ?? "-"}）。失敗 ${failures.length} 件`
  );
  for (const f of failures) console.log(`  - ${f}`);
  if (db) {
    const membershipCount = await rebuildFactionMemberships(db, todayInJapan());
    console.log(`🔁 会派の所属の期間を ${membershipCount} 件に作り直しました`);
    if (formerSpeakers.size > 0) {
      console.log(`ℹ️  今の議員名簿に無い質問者（元議員など。member_id は空）: ${[...formerSpeakers].map(([n, c]) => `${n}(${c})`).join("、")}`);
    }
    if (unresolvedFactions.size > 0) {
      console.log(`⚠️  会派の一覧で引けなかった会派名（会派は空のまま）: ${[...unresolvedFactions].join("、")}`);
    }
    await revalidateWebCache();
  }
}

main().catch((e) => {
  console.error("❌", errorMessage(e));
  process.exit(1);
});
