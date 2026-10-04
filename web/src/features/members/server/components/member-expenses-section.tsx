import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FactionExpense, FactionSummary } from "../../shared/types";
import { describeMembershipWindow } from "../../shared/utils/describe-membership-window";
import {
  buildExpenseBreakdown,
  estimatePerMemberExpense,
  formatExpenseDivisor,
  formatFiscalYear,
  formatYen,
  resolveExpenseDivisor,
} from "../../shared/utils/faction-expenses";
import type { MembershipWindow } from "../../shared/utils/membership-window";
import {
  EmptyNote,
  ExternalTextLink,
  MoreDetails,
  ProfileSection,
  SectionNote,
} from "./profile-section";

/**
 * 所属会派の政務活動費（区の「政務活動費収支一覧」）。
 *
 * 区は会派に交付し、会派ごとの収支を公表している。議員個人の金額は無いので、
 * 支出合計を人数で割った「1人あたりの目安」を添え、必ず「目安」と書く。
 * 年度の途中で人数が変わった会派は、交付額から出した平均の人数で割る。
 * いちばん新しい期間を開いて見せ、それより前は折りたたむ。
 */
export function MemberExpensesSection({
  faction,
  expenses,
  window,
  termNumber,
  memberName,
}: {
  faction: FactionSummary | null;
  expenses: FactionExpense[];
  window: MembershipWindow;
  termNumber: number | null;
  memberName: string;
}) {
  const [latest, ...older] = expenses;
  const { since, reason } = faction
    ? describeMembershipWindow(window, {
        memberName,
        factionName: faction.name,
        termNumber,
      })
    : { since: null, reason: null };

  return (
    <ProfileSection
      id="expenses"
      title="所属会派の政務活動費"
      icon={Wallet}
      description="政務活動費は会派に交付され、区は会派ごとの収支を公表しています。議員1人ひとりの金額は公表されていません。"
    >
      <SectionNote>
        {[
          "「1人あたりの目安」は、会派の支出合計を人数で割ったもので、区が公表した金額ではありません。年度の途中で人数が変わった会派は、交付額（1人1か月15万円）から出した期間を通した平均の人数で割っています。",
          since
            ? `${since}以降にかかる期間の収支を載せています${reason ? `（${reason}）` : ""}。`
            : null,
        ]
          .filter(Boolean)
          .join("")}
      </SectionNote>

      {!faction ? (
        <EmptyNote>
          会派に属していないため、政務活動費の収支はありません。
        </EmptyNote>
      ) : !latest ? (
        <EmptyNote>
          この期間の収支一覧はまだありません。区は年度が終わってから収支一覧を公表します。
        </EmptyNote>
      ) : (
        <>
          <ExpenseCard expense={latest} />
          {older.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold text-mirai-text">
                それより前の年度
              </h3>
              <ul className="flex flex-col gap-2">
                {older.map((expense) => (
                  <li key={expense.id}>
                    <MoreDetails summary={olderSummary(expense)}>
                      <ExpenseCard expense={expense} bare />
                    </MoreDetails>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </ProfileSection>
  );
}

/** 折りたたんだ年度の見出し（年度と期間、その下に1人あたりの目安）。 */
function olderSummary(expense: FactionExpense) {
  const perMember = estimatePerMemberExpense(
    expense.total_expense,
    resolveExpenseDivisor(expense)
  );
  return (
    <span className="flex flex-col gap-0.5">
      <span>
        {`${formatFiscalYear(expense.fiscal_year)}（${expense.period_label}）`}
      </span>
      <span className="text-xs font-normal text-mirai-text-secondary">
        {perMember !== null
          ? `1人あたりの目安 ${formatYen(perMember)}`
          : `支出合計 ${formatYen(expense.total_expense)}`}
      </span>
    </span>
  );
}

function ExpenseCard({
  expense,
  bare = false,
}: {
  expense: FactionExpense;
  /** 折りたたみの中では枠と見出しを省く */
  bare?: boolean;
}) {
  const divisor = resolveExpenseDivisor(expense);
  const perMember = estimatePerMemberExpense(expense.total_expense, divisor);
  const breakdown = buildExpenseBreakdown(expense);

  return (
    <article
      className={cn(
        "flex flex-col gap-4",
        !bare && "rounded-2xl border border-line-soft p-4 md:p-5"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h3
          className={
            bare ? "sr-only" : "text-lg font-extrabold text-mirai-text"
          }
        >
          {`${formatFiscalYear(expense.fiscal_year)}（${expense.period_label}）`}
        </h3>
        <p className="text-xs text-mirai-text-secondary">
          {expense.member_count !== null
            ? `${expense.faction_name}・収支一覧の人数 ${expense.member_count}人`
            : expense.faction_name}
        </p>
      </div>

      <dl className="grid gap-2 sm:grid-cols-3">
        <Figure
          label="収入（区からの交付額）"
          value={formatYen(expense.income)}
        />
        <Figure label="支出合計" value={formatYen(expense.total_expense)} />
        <Figure
          label="1人あたりの目安"
          value={perMember !== null ? formatYen(perMember) : "—"}
          note={
            divisor
              ? `支出合計÷${formatExpenseDivisor(divisor)}（目安）${divisor.basis === "average" ? "。年度の途中で人数が変わったため、交付額から出した平均の人数" : ""}`
              : "人数が分からないため出していません"
          }
          emphasis
        />
      </dl>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-bold text-mirai-text">費目ごとの支出</h4>
        {/*
          帯の長さをそろえるため、列の幅は固定する。狭い画面では費目と金額を
          1行目に、帯を2行目に置く（3列に並べると帯が短くなりすぎる）。
        */}
        <ul className="flex flex-col gap-2.5 sm:gap-2">
          {breakdown.map((item) => (
            <li
              key={item.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs text-mirai-text sm:grid-cols-[8rem_minmax(0,1fr)_7.5rem]"
            >
              <span>{item.label}</span>
              <span
                aria-hidden
                className="order-last col-span-2 block h-2 overflow-hidden rounded-full bg-mirai-surface-muted sm:order-none sm:col-span-1"
              >
                <span
                  className="block h-full rounded-full bg-brand-accent"
                  style={{ width: `${item.percent}%` }}
                />
              </span>
              <span className="text-right font-bold tabular-nums">
                {formatYen(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {expense.notes.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-2xl bg-mirai-surface px-4 py-3 text-xs leading-relaxed text-mirai-text-secondary">
          {expense.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <p className="text-xs text-mirai-text-muted">
        {`出典：${expense.source_title}（`}
        <ExternalTextLink href={expense.source_url}>
          新宿区「政務活動費」のページ
        </ExternalTextLink>
        ）
      </p>
    </article>
  );
}

function Figure({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-2xl px-4 py-3",
        emphasis ? "bg-brand-accent-tint" : "bg-mirai-surface"
      )}
    >
      <dt className="text-xs font-bold text-mirai-text-secondary">{label}</dt>
      <dd className="font-lexend text-lg font-bold tabular-nums text-mirai-text">
        {value}
      </dd>
      {note && <dd className="text-xs text-mirai-text-muted">{note}</dd>}
    </div>
  );
}
