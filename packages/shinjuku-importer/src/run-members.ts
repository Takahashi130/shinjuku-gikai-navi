/**
 * 今の議員と会派を、区の議員名簿・会派構成・委員会名簿・議長と副議長のページから取り込む
 *
 * 使い方:
 *   pnpm --filter @mirai-gikai/shinjuku-importer members [--dry-run]
 *
 * 書き込むテーブル: factions, faction_names, members, member_terms, member_positions, faction_memberships
 * 住所・電話・メール・ホームページ・顔写真はページにあっても読まない。
 */
import { buildMemberRecords } from "./build-member-records";
import { createDb, errorMessage, revalidateWebCache, todayInJapan } from "./cli-helpers";
import { autoFactionSlug, createFactionResolver, type Db } from "./faction-store";
import { fetchText } from "./fetch";
import { rebuildFactionMemberships } from "./membership-store";
import { factionNameKey } from "./normalize-member-name";
import { type CommitteeRoster, parseCommitteeRoster, parseCouncilOfficers } from "./parse-committee-roster";
import { type FactionPageEntry, parseFactionPage } from "./parse-faction-page";
import { parseMemberList } from "./parse-member-list";

const MEMBER_LIST_URL = "https://www.city.shinjuku.lg.jp/kusei/gikai01_000112.html";
const FACTION_PAGE_URL = "https://www.city.shinjuku.lg.jp/kusei/file08_00003.html";
const COMMITTEE_ROSTER_URL = "https://www.city.shinjuku.lg.jp/kusei/file08_01_00013.html";
const COUNCIL_OFFICERS_URL = "https://www.city.shinjuku.lg.jp/kusei/gikai01_000116.html";

/** 会派構成ページの会派を「今の会派」にし、id を返す。一覧に無い会派は新しく作る */
async function updateCurrentFactions(
  db: Db,
  entries: FactionPageEntry[],
  roster: CommitteeRoster,
  warnings: string[]
): Promise<(name: string) => string | null> {
  const unresolved = new Set<string>();
  let resolve = await createFactionResolver(db, unresolved);
  for (const entry of entries) {
    if (resolve(entry.name)) continue;
    warnings.push(`会派の一覧（src/data/factions.ts）に無い会派「${entry.name}」を新しく作りました。名称変更なら一覧に追記してください`);
    const { data, error } = await db
      .from("factions")
      .upsert({ slug: autoFactionSlug(entry.name), name: entry.name }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw error;
    const { error: nameError } = await db
      .from("faction_names")
      .upsert({ faction_id: data.id, name: entry.name, name_key: factionNameKey(entry.name) }, { onConflict: "name_key" });
    if (nameError) throw nameError;
  }
  resolve = await createFactionResolver(db, unresolved);

  const { error: resetError } = await db
    .from("factions")
    .update({ is_current: false, member_count: null, short_name: null })
    .eq("is_current", true);
  if (resetError) throw resetError;
  for (const [k, entry] of entries.entries()) {
    const shortName = [...roster.factionAbbreviations].find(([, name]) => factionNameKey(name) === factionNameKey(entry.name))?.[0];
    const { error } = await db
      .from("factions")
      .update({
        name: entry.name,
        is_current: true,
        member_count: entry.memberCount,
        short_name: shortName ?? null,
        sort_order: k + 1,
        source_url: FACTION_PAGE_URL,
      })
      .eq("id", resolve(entry.name)!);
    if (error) throw error;
  }
  return resolve;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const db = createDb(dryRun);

  const list = parseMemberList(await fetchText(MEMBER_LIST_URL));
  const factionEntries = parseFactionPage(await fetchText(FACTION_PAGE_URL));
  const roster = parseCommitteeRoster(await fetchText(COMMITTEE_ROSTER_URL));
  const officers = parseCouncilOfficers(await fetchText(COUNCIL_OFFICERS_URL));
  const { members, warnings } = buildMemberRecords(list, factionEntries, roster, officers);

  console.log(`👥 議員 ${members.length} 人（第${list.termNumber}期 ${list.termStart}〜${list.termEnd}）`);
  console.log(`🏛️  会派 ${factionEntries.length}: ${factionEntries.map((f) => `${f.name}（${f.memberCount}人）`).join("、")}`);
  console.log(`📋 委員会 ${roster.committees.length}、議長・副議長 ${officers.map((o) => `${o.role} ${o.name}`).join("、")}`);

  if (!db) {
    for (const m of members) {
      console.log(`  No.${m.seatNumber} ${m.name}（${m.nameKana ?? "-"}）${m.electedCount ?? "-"}期 ${m.factionName} / ${m.positions.map((p) => `${p.bodyName}${p.role}`).join("・")}`);
    }
  } else {
    const resolveFaction = await updateCurrentFactions(db, factionEntries, roster, warnings);

    const { data: saved, error } = await db
      .from("members")
      .upsert(
        members.map((m) => ({
          name: m.name,
          name_key: m.nameKey,
          name_kana: m.nameKana,
          seat_number: m.seatNumber,
          elected_count: m.electedCount,
          faction_id: resolveFaction(m.factionName),
          is_current: true,
          source_url: MEMBER_LIST_URL,
        })),
        { onConflict: "name_key" }
      )
      .select("id, name_key");
    if (error) throw error;
    const idByKey = new Map(saved.map((m) => [m.name_key, m.id]));

    // 名簿から外れた議員は残し、今の議員ではないことにする
    const { data: current, error: currentError } = await db.from("members").select("id, name_key").eq("is_current", true);
    if (currentError) throw currentError;
    const leftIds = current.filter((m) => !idByKey.has(m.name_key)).map((m) => m.id);
    if (leftIds.length > 0) {
      const { error: leftError } = await db.from("members").update({ is_current: false }).in("id", leftIds);
      if (leftError) throw leftError;
      console.log(`👋 名簿から外れた議員 ${leftIds.length} 人を「今の議員ではない」にしました`);
    }

    if (list.termNumber && list.termStart && list.termEnd) {
      const { error: termError } = await db.from("member_terms").upsert(
        saved.map((m) => ({
          member_id: m.id,
          term_number: list.termNumber!,
          term_start: list.termStart!,
          term_end: list.termEnd!,
          election_date: list.electionDate,
          source_url: MEMBER_LIST_URL,
        })),
        { onConflict: "member_id,term_number" }
      );
      if (termError) throw termError;
    } else {
      warnings.push("議員名簿の任期（第◯期任期：…）が読めないため、任期は書き込みませんでした");
    }

    const memberIds = saved.map((m) => m.id);
    const { error: deleteError } = await db.from("member_positions").delete().in("member_id", memberIds);
    if (deleteError) throw deleteError;
    const positions = members.flatMap((m) =>
      m.positions.map((p) => ({
        member_id: idByKey.get(m.nameKey)!,
        body_kind: p.bodyKind,
        body_name: p.bodyName,
        role: p.role,
        sort_order: p.sortOrder,
        source_url:
          p.bodyKind === "council" ? COUNCIL_OFFICERS_URL : p.bodyKind === "faction" ? FACTION_PAGE_URL : COMMITTEE_ROSTER_URL,
      }))
    );
    if (positions.length > 0) {
      const { error: positionError } = await db.from("member_positions").insert(positions);
      if (positionError) throw positionError;
    }

    const membershipCount = await rebuildFactionMemberships(db, todayInJapan());
    console.log(`✅ 議員 ${saved.length} 人・役職 ${positions.length} 件・会派の所属の期間 ${membershipCount} 件を取り込みました`);
  }

  if (warnings.length > 0) {
    console.log("⚠️  確認が必要なこと:");
    for (const w of warnings) console.log(`  - ${w}`);
  }
  if (!dryRun) await revalidateWebCache();
}

main().catch((e) => {
  console.error("❌", errorMessage(e));
  process.exit(1);
});
