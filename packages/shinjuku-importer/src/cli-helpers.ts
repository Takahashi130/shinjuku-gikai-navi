/**
 * 取り込みコマンド（members / questions / expenses / faction-votes）で共通に使う処理
 */
import type { Database } from "@mirai-gikai/supabase";
import { createClient } from "@supabase/supabase-js";
import type { Db } from "./faction-store";
import { fetchText } from "./fetch";
import { extractSessionLinks } from "./session-index";

export const SESSION_INDEX_URL = "https://www.city.shinjuku.lg.jp/kusei/file08_00015.html";

/** 日本時間の今日（YYYY-MM-DD） */
export function todayInJapan(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** .env の開発用 Supabase に接続する（--dry-run のときは接続しない） */
export function createDb(dryRun: boolean): Db | null {
  if (dryRun) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL と SUPABASE_SECRET_KEY を .env に設定してください");
  return createClient<Database>(url, key);
}

/** 引数の会期ページ URL、または --all で「定例会・臨時会」一覧の会期（新しい順） */
export async function sessionUrlsFromArgs(args: string[]): Promise<string[]> {
  if (args.includes("--all")) return extractSessionLinks(await fetchText(SESSION_INDEX_URL), SESSION_INDEX_URL);
  return args.filter((a) => a.startsWith("http"));
}

/** 画面のキャッシュを消して、取り込んだ内容をすぐ表示させる */
export async function revalidateWebCache() {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!webUrl || !secret) return;
  try {
    const res = await fetch(new URL("/api/revalidate", webUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    console.log(res.ok ? "🧹 画面のキャッシュを更新しました" : `⚠️  キャッシュの更新に失敗しました (${res.status})`);
  } catch {
    console.warn("⚠️  Web サーバーに接続できないため、キャッシュは更新していません");
  }
}

/** 例外を読める文字列にする（Supabase のエラーはオブジェクトのため） */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return JSON.stringify(e);
}
