import { LabelPill, type LabelPillTone } from "@/components/ui/label-pill";
import type { BillStatusEnum } from "../../../shared/types";
import {
  type BillStatusVariant,
  getCardStatusLabel,
  getStatusVariant,
} from "../../../shared/utils/bill-status";

interface BillStatusBadgeProps {
  status: BillStatusEnum;
  size?: "sm" | "md";
  className?: string;
}

/** 可決=緑系・否決=赤系（会派の賛成・反対と同じ系統）、審議中=アクセントの淡い地。 */
const STATUS_TONES: Record<BillStatusVariant, LabelPillTone> = {
  "status-deliberating": "accent",
  "status-enacted": "for",
  "status-rejected": "against",
  "status-pending": "outline",
};

/** 議案のステータス（審議中・可決・否決・議案提出前）のピル。 */
export function BillStatusBadge({
  status,
  size = "sm",
  className,
}: BillStatusBadgeProps) {
  return (
    <LabelPill
      tone={STATUS_TONES[getStatusVariant(status)]}
      size={size}
      className={className}
    >
      {getCardStatusLabel(status)}
    </LabelPill>
  );
}
