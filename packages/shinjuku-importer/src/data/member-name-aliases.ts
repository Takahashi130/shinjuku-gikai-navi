/**
 * 区のページの議員名の表記ゆれ（同じ議員と確認できたものだけ）
 *
 * キーと値は memberNameKey（空白を除いた名前）。
 * - 「かなくぼななこ」: 令和7年第3回定例会の質問者一覧の表記。議員名簿の表記は「かなくぼ なな子」で、
 *   同じ名字の議員はほかにいない（会派も同じ新宿未来の会）。
 */
import { memberNameKey } from "../normalize-member-name";

export const MEMBER_NAME_ALIASES: Record<string, string> = {
  かなくぼななこ: "かなくぼなな子",
};

/** 区のページの議員名を、議員名簿の表記に合わせた突き合わせ用のキーにする */
export function canonicalMemberKey(name: string): string {
  const key = memberNameKey(name);
  return MEMBER_NAME_ALIASES[key] ?? key;
}
