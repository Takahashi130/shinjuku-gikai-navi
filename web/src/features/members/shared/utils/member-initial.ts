/**
 * 顔写真の代わりに出す頭文字（名前の最初の1文字）。
 *
 * 顔写真は議員の許可を取っていないので載せない。名前の先頭の空白は飛ばし、
 * 「木もと ひろゆき」なら「木」、「かなくぼ なな子」なら「か」にする。
 * サロゲートペアの漢字（𠮷 など）も1文字として扱う。
 */
export function getMemberInitial(name: string): string {
  const [first] = Array.from(name.replace(/[\s　]+/g, ""));
  return first ?? "？";
}
