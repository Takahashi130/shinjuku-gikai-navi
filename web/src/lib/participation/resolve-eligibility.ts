import type { Database } from "@mirai-gikai/supabase";

/**
 * 投票・投稿した時点の参加資格（DB の participant_eligibility）。
 * 票やコメントには、この値をその時点のまま記録する。
 */
export type ParticipantEligibility =
  Database["public"]["Enums"]["participant_eligibility"];

/** 回（polls.audience）ごとの参加できる人の範囲 */
export type PollAudience = "anyone" | "resident_declared" | "resident_verified";

export function isPollAudience(value: string): value is PollAudience {
  return (
    value === "anyone" ||
    value === "resident_declared" ||
    value === "resident_verified"
  );
}

/**
 * 参加者の資格を決める。
 *
 * 今は区民かどうかを確かめるしくみが無い（A 案：誰でも参加・参考値）ので、
 * 何も渡されなければ常に unverified になる。
 * - 将来の区民認証：verifiedResident = true で verified_resident
 * - 自己申告（B 案）を入れる場合：residencyClaim で self_declared_*
 */
export function resolveEligibility(input: {
  verifiedResident?: boolean;
  residencyClaim?: "resident" | "nonresident" | null;
}): ParticipantEligibility {
  if (input.verifiedResident) return "verified_resident";
  if (input.residencyClaim === "resident") return "self_declared_resident";
  if (input.residencyClaim === "nonresident") {
    return "self_declared_nonresident";
  }
  return "unverified";
}

/** その資格で、その範囲の回に参加できるか */
export function isEligibleForAudience(
  audience: PollAudience,
  eligibility: ParticipantEligibility
): boolean {
  switch (audience) {
    case "anyone":
      return true;
    case "resident_declared":
      return (
        eligibility === "self_declared_resident" ||
        eligibility === "verified_resident"
      );
    case "resident_verified":
      return eligibility === "verified_resident";
  }
}
