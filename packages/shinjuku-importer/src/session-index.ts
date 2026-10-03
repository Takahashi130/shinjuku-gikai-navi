/**
 * 「定例会・臨時会」一覧ページから、各会期ページへのリンクを取り出す
 */
export function extractSessionLinks(html: string, indexUrl: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const text = m[2].replace(/<[^>]+>/g, "").replace(/[\s　]/g, "");
    // 「第2回定例会」のほか、会期中の「令和8年第3回定例会の主な日程」も対象にする
    if (!/^(令和\d+年)?第\d+回(定例会|臨時会)(の主な日程)?$/.test(text)) continue;
    const url = new URL(m[1], indexUrl).toString();
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}
