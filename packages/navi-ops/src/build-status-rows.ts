import {
  type ExplainerPublication,
  type ExplainerReadiness,
  explainerReadiness,
} from "@mirai-gikai/shared/bill-explainer/explainer-readiness";

export type StatusBill = { slug: string | null; name: string };

export type StatusRow = {
  slug: string;
  name: string;
  /** explainers/ のファイルの状態（無ければ null） */
  file: {
    status: string;
    version: number;
    errors: number;
    warnings: number;
  } | null;
  hasMaterial: boolean;
  /** DB（bill_explainers）の状態（無ければ null） */
  db: (ExplainerPublication & { version: number }) | null;
  readiness: ExplainerReadiness;
  /** ファイルと DB が食い違っている（同期が必要） */
  needsSync: boolean;
  /** 画面で「準備中」と出る下書きが DB にあるか（web の hasDraft と同じ判定） */
  hasDraft: boolean;
};

/**
 * 画面での見え方を日本語で表す。
 * 「準備中」は、画面（web）と同じく下書きが DB にあるときだけにし、
 * 下書きが無ければ「まだありません」とする（材料も無ければそれも添える）。
 */
export function readinessLabel(
  r: ExplainerReadiness,
  context?: { hasDraft: boolean; hasMaterial: boolean }
): string {
  switch (r.state) {
    case "available":
      return "公開中";
    case "scheduled":
      return `予約公開（${r.publishAt}）`;
    case "preparing":
      if (context && !context.hasDraft) {
        return context.hasMaterial ? "まだありません" : "まだありません（材料なし）";
      }
      return r.afterVote ? "準備中（採決後に公開）" : "準備中";
    case "not_applicable":
      return "対象外（人事案件）";
    case "not_available":
      return r.reason === "withdrawn" ? "取り下げ" : "過去の議案";
  }
}

/** 会期の議案ごとに、解説ファイル・材料・DB・画面での見え方を並べる */
export function buildStatusRows(input: {
  bills: StatusBill[];
  files: Map<string, StatusRow["file"]>;
  materials: Set<string>;
  db: Map<string, ExplainerPublication & { version: number }>;
  voteAt: string | null;
  now: Date;
}): StatusRow[] {
  return input.bills
    .filter((b): b is StatusBill & { slug: string } => b.slug !== null)
    .map((bill) => {
      const file = input.files.get(bill.slug) ?? null;
      const db = input.db.get(bill.slug) ?? null;
      return {
        slug: bill.slug,
        name: bill.name,
        file,
        hasMaterial: input.materials.has(bill.slug),
        db,
        readiness: explainerReadiness({
          billSlug: bill.slug,
          billName: bill.name,
          explainer: db,
          voteAt: input.voteAt,
          now: input.now,
        }),
        needsSync:
          file !== null &&
          (db === null ||
            db.version !== file.version ||
            db.status !== file.status),
        hasDraft: db !== null && db.status !== "withdrawn",
      };
    });
}

/** slug の末尾の番号で並べる（r8-teirei-3-gian-63 < r8-teirei-3-gian-100） */
export function compareBillSlugs(a: string, b: string): number {
  const split = (s: string) => {
    const m = s.match(/^(.*?)(\d+)$/);
    return m ? ([m[1], Number(m[2])] as const) : ([s, 0] as const);
  };
  const [pa, na] = split(a);
  const [pb, nb] = split(b);
  return pa === pb ? na - nb : pa < pb ? -1 : 1;
}

/** 一覧の1行の見え方（下書き・材料の有無を含めて、画面の表示とそろえる） */
export function statusRowLabel(row: StatusRow): string {
  return readinessLabel(row.readiness, {
    hasDraft: row.hasDraft,
    hasMaterial: row.hasMaterial,
  });
}
