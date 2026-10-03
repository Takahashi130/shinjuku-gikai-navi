/**
 * 回数制限のキーに使う形に、接続元の IP アドレスをそろえる。
 *
 * - IPv4 はそのまま（「::ffff:203.0.113.1」のような IPv4 射影アドレスも IPv4 にする）
 * - IPv6 は先頭の 64 ビット（/64）に丸める。1つの回線には /64 以上がまとめて
 *   割り当てられることが多く、その中でアドレスを変えるだけで制限を避けられないようにする
 * - 読めない値は、空白を除いて小文字にしただけで返す（それでもハッシュして使う）
 *
 * 生の IP は保存しない。呼び出し側はこの結果を HMAC してから使う。
 */
export function normalizeIpForRateLimit(raw: string): string {
  let ip = raw.trim().toLowerCase();
  // 「[2001:db8::1]:443」「203.0.113.1:443」のようなポート付きの形
  const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) ip = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, "");
  // ゾーン ID（fe80::1%eth0）
  ip = ip.replace(/%.*$/, "");

  if (isIpv4(ip)) return ip;

  const groups = expandIpv6(ip);
  if (!groups) return ip;
  // IPv4 射影アドレス（::ffff:a.b.c.d）
  if (groups.slice(0, 5).every((g) => g === "0000") && groups[5] === "ffff") {
    const n = [groups[6], groups[7]].map((g) => Number.parseInt(g, 16));
    return [n[0] >> 8, n[0] & 0xff, n[1] >> 8, n[1] & 0xff].join(".");
  }
  return `${groups.slice(0, 4).join(":")}::/64`;
}

function isIpv4(ip: string): boolean {
  const parts = ip.split(".");
  return (
    parts.length === 4 &&
    parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
  );
}

/** IPv6 を 8 つの 4 桁の 16 進に展開する（読めなければ null） */
function expandIpv6(ip: string): string[] | null {
  if (!ip.includes(":")) return null;
  // 末尾が IPv4 の形（::ffff:1.2.3.4 以外の埋め込み）は 2 つの 16 進に直す
  let text = ip;
  const v4Tail = text.match(/:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4Tail) {
    if (!isIpv4(v4Tail[1])) return null;
    const [a, b, c, d] = v4Tail[1].split(".").map(Number);
    const hi = ((a << 8) | b).toString(16);
    const lo = ((c << 8) | d).toString(16);
    text = `${text.slice(0, -v4Tail[1].length)}${hi}:${lo}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const groups = [...head, ...Array(missing).fill("0"), ...tail];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.padStart(4, "0"));
}
