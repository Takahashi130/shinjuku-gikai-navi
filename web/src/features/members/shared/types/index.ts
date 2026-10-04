import type { Database } from "@mirai-gikai/supabase";

type Tables = Database["public"]["Tables"];

export type MemberRow = Tables["members"]["Row"];
export type FactionRow = Tables["factions"]["Row"];
export type MemberTermRow = Tables["member_terms"]["Row"];
export type FactionMembershipRow = Tables["faction_memberships"]["Row"];
export type MemberPositionRow = Tables["member_positions"]["Row"];
export type PlenaryQuestionRow = Tables["plenary_questions"]["Row"];
export type FactionExpenseRow = Tables["faction_activity_expenses"]["Row"];
export type BillFactionVoteRow = Tables["bill_faction_votes"]["Row"];

/** 一覧・プロフィールで使う会派（今の会派構成ページにある会派）。 */
export type FactionSummary = Pick<
  FactionRow,
  | "id"
  | "slug"
  | "name"
  | "short_name"
  | "sort_order"
  | "formed_on"
  | "note"
  | "source_url"
>;

/** 役職（議長・委員会・会派の役職）。区のページの表記のまま持つ。 */
export type MemberPosition = Pick<
  MemberPositionRow,
  "body_kind" | "body_name" | "role" | "sort_order"
>;

/** 本会議の質問の回数。委員会の質問は含まない。 */
export type QuestionStats = {
  /** 質問した回数（1会期の代表質問・一般質問をそれぞれ1回と数える） */
  count: number;
  representativeCount: number;
  generalCount: number;
  /** 質問の題名の数 */
  topicCount: number;
};

/** 政務活動費の1人あたりの目安を出すときに割る人数（resolveExpenseDivisor）。 */
export type ExpenseDivisor = {
  /** 人数（平均の人数は小数になる） */
  value: number;
  /**
   * - member_count：収支一覧の人数（期間を通して人数が変わっていない）
   * - average：交付額 ÷（15万円 × 月数）で出した、期間を通した平均の人数
   *   （年度の途中で人数が変わった会派）
   */
  basis: "member_count" | "average";
};

/**
 * 所属会派の政務活動費の、いちばん新しい期間の1人あたりの目安
 * （latestExpenseEstimate）。区は議員個人の金額を公表していないので、
 * 画面では必ず「目安」と書く。
 */
export type ExpenseEstimate = {
  fiscalYear: number;
  /** 収支一覧の期間の表記（「令和7年4月～令和8年3月分」など） */
  periodLabel: string;
  totalExpense: number;
  /** 収支一覧の人数。分からなければ null */
  memberCount: number | null;
  /** 割った人数（年度の途中で人数が変わった会派は平均の人数）。分からなければ null */
  divisor: ExpenseDivisor | null;
  /** 1人あたりの目安（円）。人数が分からなければ null */
  perMember: number | null;
};

/** 議員の一覧（/members）の1人分。 */
export type MemberListItem = {
  id: string;
  name: string;
  nameKana: string | null;
  seatNumber: number | null;
  electedCount: number | null;
  factionId: string | null;
  positions: MemberPosition[];
  /** 今の任期の本会議の質問の回数（全員同じ期間で数える） */
  questions: QuestionStats;
  /** 所属会派の政務活動費の1人あたりの目安。会派なし・収支一覧なしは null */
  expenseEstimate: ExpenseEstimate | null;
};

/** 本会議の質問の題名1つ分。 */
export type QuestionTopic = {
  number: number | null;
  title: string;
  /** 答弁者（区長・教育委員会など）。区のページに無ければ空 */
  responders: string[];
};

/** 議員のページに出す本会議の質問1回分。 */
export type MemberQuestion = Pick<
  PlenaryQuestionRow,
  | "id"
  | "session_title"
  | "question_type"
  | "asked_on"
  | "faction_name"
  | "answer_style"
  | "sort_order"
  | "source_url"
> & {
  topics: QuestionTopic[];
};

/** 会派の所属の履歴（区の資料で確認できた範囲）。 */
export type MembershipPeriod = Pick<
  FactionMembershipRow,
  "faction_id" | "first_seen_on" | "last_seen_on" | "is_current"
> & {
  factionName: string;
  factionSlug: string;
  factionIsCurrent: boolean;
  /** この期間に使われていた、今とは違う会派名（formerFactionNamesDuring） */
  formerNames: { name: string; validTo: string | null }[];
};

/** 会派の賛否1件分（議案と会期つき）。 */
export type FactionVoteRecord = Pick<
  BillFactionVoteRow,
  "vote" | "note" | "faction_name"
> & {
  bill: {
    id: string;
    name: string;
    isSplit: boolean;
    submittedDate: string | null;
  };
  session: { name: string; endDate: string } | null;
};

/** 政務活動費の1期間分（会派ごと）。 */
export type FactionExpense = Omit<
  FactionExpenseRow,
  "created_at" | "updated_at" | "faction_id" | "sort_order" | "id"
> & { id: string };
