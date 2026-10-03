import type { BillStatusEnum } from "../types";

/** カード用の簡略化されたステータスラベルを取得 */
export function getCardStatusLabel(status: BillStatusEnum): string {
  switch (status) {
    case "introduced":
    case "in_originating_house":
    case "in_receiving_house":
      return "審議中";
    case "enacted":
      return "可決";
    case "rejected":
      return "否決";
    default:
      return "議案提出前";
  }
}

/** ステータスのバッジの見た目。Badge の variant 名と対応する。 */
export type BillStatusVariant =
  | "status-deliberating"
  | "status-enacted"
  | "status-rejected"
  | "status-pending";

/**
 * ステータスに対応するBadgeのvariantを取得。
 * 可決は緑系・否決は赤系にして、会派の賛成・反対の色と系統を揃える。
 */
export function getStatusVariant(status: BillStatusEnum): BillStatusVariant {
  switch (status) {
    case "introduced":
    case "in_originating_house":
    case "in_receiving_house":
      return "status-deliberating";
    case "enacted":
      return "status-enacted";
    case "rejected":
      return "status-rejected";
    default:
      return "status-pending";
  }
}
