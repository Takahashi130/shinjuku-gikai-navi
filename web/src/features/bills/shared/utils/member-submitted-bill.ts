/**
 * 議員提出議案か（取り込みが議案の slug を「…-giin-N」にしている）。
 *
 * 区のウェブサイトの議案一覧・審議結果には、議員提出議案の提出者（どの議員・
 * 会派が出したか）が載っていないので、ここでは議員提出議案かどうかだけを見分ける。
 * 議員カルテの「政策提案」から、議案一覧の「議員提出議案のみ」へ送るのに使う。
 */
export function isMemberSubmittedBillSlug(
  slug: string | null | undefined
): boolean {
  return typeof slug === "string" && /-giin-\d+$/.test(slug);
}
