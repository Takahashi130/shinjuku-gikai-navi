/**
 * 区のサイトに負荷をかけないための取得ヘルパー
 * - リクエスト間隔を 1 秒以上あける
 * - User-Agent に連絡先（リポジトリ URL）を入れる
 */

const USER_AGENT =
  "mirai-gikai-shinjuku-importer (+https://github.com/Takahashi130/mirai-gikai-shinjuku)";
const MIN_INTERVAL_MS = 1000;

let lastRequestAt = 0;

async function politeFetch(url: string): Promise<Response> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`取得に失敗しました (${res.status}): ${url}`);
  return res;
}

export async function fetchText(url: string): Promise<string> {
  return (await politeFetch(url)).text();
}

export async function fetchBytes(url: string): Promise<Uint8Array> {
  return new Uint8Array(await (await politeFetch(url)).arrayBuffer());
}
