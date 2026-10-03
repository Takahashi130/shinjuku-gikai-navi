/**
 * 会派（factions / faction_names）の読み書き
 */
import { createHash } from "node:crypto";
import type { Database } from "@mirai-gikai/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findKnownFactionSlug, KNOWN_FACTIONS } from "./data/factions";
import { cleanFactionName, factionNameKey } from "./normalize-member-name";

export type Db = SupabaseClient<Database>;

/** 会派名 → 会派の id。引けない名前は null */
export type FactionResolver = (name: string) => string | null;

/** 会派一覧（src/data/factions.ts）を DB に入れ、slug → id の対応を返す */
export async function ensureKnownFactions(db: Db): Promise<Map<string, string>> {
  const { data, error } = await db
    .from("factions")
    .upsert(
      KNOWN_FACTIONS.map((f) => ({
        slug: f.slug,
        name: f.name,
        formed_on: f.formedOn ?? null,
        dissolved_on: f.dissolvedOn ?? null,
        note: f.note ?? null,
      })),
      { onConflict: "slug" }
    )
    .select("id, slug");
  if (error) throw error;
  const ids = new Map(data.map((f) => [f.slug, f.id]));

  const names = KNOWN_FACTIONS.flatMap((f) =>
    f.names.map((n) => ({
      faction_id: ids.get(f.slug)!,
      name: n.name,
      name_key: factionNameKey(n.name),
      valid_from: n.validFrom ?? null,
      valid_to: n.validTo ?? null,
      note: n.note ?? null,
    }))
  );
  const { error: nameError } = await db.from("faction_names").upsert(names, { onConflict: "name_key" });
  if (nameError) throw nameError;

  const { data: all, error: allError } = await db.from("factions").select("id, slug");
  if (allError) throw allError;
  return new Map(all.map((f) => [f.slug, f.id]));
}

/** 一覧に無い今の会派を作るときの slug（名前から決まる短い値） */
export function autoFactionSlug(name: string): string {
  return `auto-${createHash("sha1").update(factionNameKey(name)).digest("hex").slice(0, 10)}`;
}

/**
 * 会派名から id を引く関数を作る。DB の faction_names（自動で作った会派を含む）も見る。
 * 引けなかった名前は warnings に1回だけ記録する。
 */
export async function createFactionResolver(db: Db, warnings?: Set<string>): Promise<FactionResolver> {
  const slugToId = await ensureKnownFactions(db);
  const { data, error } = await db.from("faction_names").select("faction_id, name_key");
  if (error) throw error;
  const byKey = new Map(data.map((n) => [n.name_key, n.faction_id]));
  return (name: string) => {
    const slug = findKnownFactionSlug(name);
    const id = (slug && slugToId.get(slug)) || byKey.get(factionNameKey(name)) || null;
    if (!id) warnings?.add(cleanFactionName(name));
    return id;
  };
}

const resolverCache = new WeakMap<Db, Promise<FactionResolver>>();

/** 同じ接続では会派一覧を1回だけ読む（ingest から議案ごとに呼ばれるため） */
export function getFactionResolver(db: Db): Promise<FactionResolver> {
  let resolver = resolverCache.get(db);
  if (!resolver) {
    resolver = createFactionResolver(db);
    resolverCache.set(db, resolver);
  }
  return resolver;
}
