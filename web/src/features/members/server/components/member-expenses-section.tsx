import { formatDate } from "@/lib/utils/date";
import type { FactionExpense, FactionSummary } from "../../shared/types";
import {
  buildExpenseBreakdown,
  estimatePerMemberExpense,
  formatYen,
} from "../../shared/utils/faction-expenses";
import { EmptyNote, ExternalTextLink, ProfileSection } from "./profile-section";

/**
 * 所属会派の政務活動費（区の「政務活動費収支一覧」）。
 *
 * 区は会派に交付し、会派ごとの収支を公表している。議員個人の金額は無いので、
 * 支出合計を人数で割った「1人あたりの目安」を添え、必ず「目安」と書く。
 * いちばん新しい期間を開いて見せ、それより前は折りたたむ。
 */
export function MemberExpensesSection({
  faction,
  expenses,
  windowStart,
}: {
  faction: FactionSummary | null;
  expenses: FactionExpense[];
  windowStart: string | null;
}) {
  const [latest, ...older] = expenses;

  return (
    <ProfileSection
      id="expenses"
      title="所属会派の政務活動費"
      lead={
        <>
          <p>
            政務活動費は会派に交付され、区は会派ごとの収支を公表しています。議員1人ひとりの金額は公表されていません。
          </p>
          <p>
            「1人あたりの目安」は、会派の支出合計を収支一覧の人数で割ったもので、区が公表した金額ではありません。
          </p>
          {windowStart && (
            <p>{`今の会派への所属を区の資料で確認できる${formatDate(windowStart)}以降にかかる期間の収支を載せています。`}</p>
          )}
        </>
      }
    >
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
              {older.map((expense) => (
                <details
                  key={expense.id}
                  className="rounded-md border border-mirai-border"
                >
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-sm">
                    <span className="font-bold text-brand-link">
                      {expense.period_label}
                    </span>
                    <span className="text-xs text-mirai-text-secondary">
                      {summaryLine(expense)}
                    </span>
                  </summary>
                  <div className="border-mirai-border border-t p-3">
                    <ExpenseCard expense={expense} bare />
                  </div>
                </details>
              ))}
            </div>
          )}
        </>
      )}
    </ProfileSection>
  );
}

function summaryLine(expense: FactionExpense): string {
  const perMember = estimatePerMemberExpense(
    expense.total_expense,
    expense.member_count
  );
  return [
    `支出合計 ${formatYen(expense.total_expense)}`,
    perMember !== null ? `1人あたりの目安 ${formatYen(perMember)}` : null,
  ]
    .filter(Boolean)
    .join("・");
}

function ExpenseCard({
  expense,
  bare = false,
}: {
  expense: FactionExpense;
  /** 折りたたみの中では枠と見出しを省く */
  bare?: boolean;
}) {
  const perMember = estimatePerMemberExpense(
    expense.total_expense,
    expense.member_count
  );
  const breakdown = buildExpenseBreakdown(expense);

  return (
    <article
      className={
        bare
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 rounded-md border border-mirai-border p-3 md:p-4"
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h3
          className={bare ? "sr-only" : "text-base font-bold text-mirai-text"}
        >
          {expense.period_label}
        </h3>
        <span className="text-xs text-mirai-text-secondary">
          {expense.member_count !== null
            ? `${expense.faction_name}・収支一覧の人数 ${expense.member_count}人`
            : expense.faction_name}
        </span>
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
            expense.member_count
              ? `支出合計÷${expense.member_count}人（目安）`
              : "人数が分からないため出していません"
          }
          emphasis
        />
      </dl>

      <div className="flex flex-col gap-1.5">
        <h4 className="text-sm font-bold text-mirai-text">費目ごとの支出</h4>
        <ul className="flex flex-col gap-1.5">
          {breakdown.map((item) => (
            <li
              key={item.key}
              className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 text-xs text-mirai-text"
            >
              <span>{item.label}</span>
              <span
                aria-hidden
                className="block h-1.5 overflow-hidden rounded-full bg-mirai-surface-muted"
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
        <ul className="flex flex-col gap-1 rounded-md bg-mirai-surface p-2.5 text-xs leading-relaxed text-mirai-text-secondary">
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
      className={
        emphasis
          ? "flex flex-col gap-0.5 rounded-md bg-brand-accent-tint px-3 py-2"
          : "flex flex-col gap-0.5 rounded-md bg-mirai-surface px-3 py-2"
      }
    >
      <dt className="text-xs text-mirai-text-secondary">{label}</dt>
      <dd className="text-lg font-bold tabular-nums text-mirai-text">
        {value}
      </dd>
      {note && <dd className="text-[11px] text-mirai-text-muted">{note}</dd>}
    </div>
  );
}
