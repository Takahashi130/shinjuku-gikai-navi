const JST = "Asia/Tokyo";

const partsFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: JST,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type JstParts = {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: string;
  minute: string;
};

function toJstParts(date: Date): JstParts {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday ?? "",
    hour: parts.hour ?? "00",
    minute: parts.minute ?? "00",
  };
}

/** 日本時間の暦日の通し番号（日数の差を出すため） */
function jstDayNumber(date: Date): number {
  const { year, month, day } = toJstParts(date);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function yearPrefix(parts: JstParts, now: Date | undefined): string {
  if (!now || Number.isNaN(now.getTime())) return "";
  return toJstParts(now).year === parts.year ? "" : `${parts.year}年`;
}

/**
 * 例：10月15日（木）14:00（日本時間）
 * now を渡すと、年が今年と違うときだけ「2025年」を前に付ける。
 */
export function formatJstDateTime(iso: string, now?: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = toJstParts(date);
  return `${yearPrefix(p, now)}${p.month}月${p.day}日（${p.weekday}）${p.hour}:${p.minute}`;
}

/** 例：10月15日（木）（日本時間）。now の扱いは formatJstDateTime と同じ */
export function formatJstDate(iso: string, now?: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = toJstParts(date);
  return `${yearPrefix(p, now)}${p.month}月${p.day}日（${p.weekday}）`;
}

/**
 * 締切までの残りを、日本時間の暦日で数えて短く言う。
 * 締切を過ぎていれば null。
 * - 2日以上先：あと n 日
 * - 翌日：あすまで
 * - 当日：きょうまで
 */
export function formatRemaining(closesAt: string, now: Date): string | null {
  const closes = new Date(closesAt);
  if (Number.isNaN(closes.getTime())) return null;
  if (now.getTime() >= closes.getTime()) return null;
  const days = jstDayNumber(closes) - jstDayNumber(now);
  if (days >= 2) return `あと${days}日`;
  if (days === 1) return "あすまで";
  return "きょうまで";
}
