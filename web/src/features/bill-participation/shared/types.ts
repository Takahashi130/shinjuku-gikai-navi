/** 一覧のカードに出す、解説と区民投票の小さな印 */
export type ParticipationBadge =
  | { kind: "explainer"; label: string }
  | {
      kind: "vote_open";
      label: string;
      /** 例：あと3日 */
      detail: string | null;
    }
  | {
      kind: "citizens_result";
      /** 例：区民 反対多数 */
      label: string;
      /** 議会の議決と、採決前の区民の多数が分かれたか */
      diverges: boolean;
    };

/** 議案 ID ごとの印（サーバーからクライアントへ渡せるよう Map ではなくオブジェクト） */
export type ParticipationBadgesByBillId = Record<string, ParticipationBadge[]>;
