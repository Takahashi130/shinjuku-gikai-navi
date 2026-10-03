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

/** 議員の一覧（/members）の1人分。 */
export type MemberListItem = {
  id: string;
  name: string;
  nameKana: string | null;
  seatNumber: number | null;
  electedCount: number | null;
  factionId: string | null;
  positions: MemberPosition[];
  questions: QuestionStats;
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

/** 議員提出議案（区議会全体。提出者は区の資料に無い）。 */
export type MemberSubmittedBill = {
  id: string;
  name: string;
  status: Database["public"]["Enums"]["bill_status_enum"];
  submittedDate: string | null;
};
