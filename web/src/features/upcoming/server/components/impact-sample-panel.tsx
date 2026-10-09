import "server-only";

import { ChartLine, TriangleAlert } from "lucide-react";
import { LabelPill } from "@/components/ui/label-pill";
import { RoundCard } from "@/components/ui/round-card";

/**
 * 「5年間の効果測定」の見本（サンプル）。
 *
 * まだ実際のデータは無いので、数字はすべて架空。画面の見出しと図の両方に
 * 「サンプル（架空のデータ）」と書き、実際の議案の名前は出さない。
 * 実データができたら、このコンポーネントごと差し替える。
 */

const YEARS = ["可決前", "1年目", "2年目", "3年目", "4年目", "5年目"] as const;

type Series = {
  key: string;
  label: string;
  values: readonly number[];
  /** 線の色（CSS の色） */
  color: string;
  /** 色だけに頼らないよう、線の形も変える */
  dash?: string;
  area?: boolean;
};

const SERIES: readonly Series[] = [
  {
    key: "target",
    label: "議会の目標（期待値）",
    values: [80, 85, 90, 95, 98, 100],
    color: "#334155",
    dash: "6 5",
  },
  {
    key: "actual",
    label: "実際の効果（実測値）",
    values: [80, 62, 54, 42, 48, 51],
    color: "#059669",
    area: true,
  },
  {
    key: "citizen",
    label: "区民投票のときの期待",
    values: [45, 45, 45, 45, 45, 45],
    color: "#e11d48",
    dash: "2 4",
  },
];

const KPIS = [
  {
    label: "区民の満足度（5年目）",
    value: "51.2点",
    sub: "（目標 85点）",
    note: "目標を大きく下回っている例",
    tone: "text-stance-against",
  },
  {
    label: "利用・稼働の実績",
    value: "98.4%",
    sub: "（正常に稼働）",
    note: "設備は計画どおり動いている例",
    tone: "text-mirai-text",
  },
  {
    label: "費用対効果",
    value: "▲1.2億円",
    sub: "（予算を超過）",
    note: "当初の予算を超えた例",
    tone: "text-orange-700",
  },
] as const;

const W = 720;
const H = 300;
const PAD = { top: 16, right: 150, bottom: 36, left: 40 };
const MAX = 120;

function x(i: number) {
  return PAD.left + (i * (W - PAD.left - PAD.right)) / (YEARS.length - 1);
}
function y(v: number) {
  return PAD.top + ((MAX - v) * (H - PAD.top - PAD.bottom)) / MAX;
}
function path(values: readonly number[]) {
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`)
    .join(" ");
}

export function ImpactSamplePanel() {
  const actual = SERIES[1];
  const areaPath = `${path(actual.values)} L${x(YEARS.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  return (
    <RoundCard
      asChild
      padding="lg"
      className="flex flex-col gap-6 border-brand-accent-light/70 shadow-md"
    >
      <section aria-labelledby="impact-sample-title">
        <div className="flex flex-col gap-3 border-brand-accent-light/60 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-brand-link">
              <ChartLine className="size-4" aria-hidden />
              条例・政策の事前予測と事後検証
            </span>
            <h2
              id="impact-sample-title"
              className="text-2xl font-extrabold tracking-tight text-mirai-text md:text-3xl"
            >
              5年間の政策効果測定・事後評価
            </h2>
            <p className="text-sm text-mirai-text-secondary">
              可決された条例が、実際の効果（満足度・経済効果・利用者数）を出しているかを追いかけます。
            </p>
          </div>
          <LabelPill tone="alert" size="md">
            <TriangleAlert aria-hidden />
            サンプル（架空のデータ）
          </LabelPill>
        </div>

        <figure className="flex flex-col gap-3 rounded-2xl border border-line-soft bg-white p-4 md:p-5">
          <figcaption className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold text-mirai-text">
              <ChartLine className="size-4 text-brand-link" aria-hidden />
              達成度の移り変わり（議会の目標 vs 実際の効果）
            </span>
            <LabelPill tone="for">判定の例：区民の心配が当たった</LabelPill>
          </figcaption>

          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-mirai-text-secondary">
            {SERIES.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <svg width="28" height="8" aria-hidden="true">
                  <line
                    x1="0"
                    y1="4"
                    x2="28"
                    y2="4"
                    stroke={s.color}
                    strokeWidth="2.5"
                    strokeDasharray={s.dash}
                  />
                </svg>
                {s.label}
              </li>
            ))}
          </ul>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label="サンプルの折れ線グラフ。議会の目標は80から100へ上がる一方、実際の効果は80から3年目に42まで下がり、5年目は51。区民投票のときの期待は45で一定。"
          >
            {[0, 20, 40, 60, 80, 100, 120].map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 8}
                  y={y(v) + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#646b75"
                >
                  {v}
                </text>
              </g>
            ))}
            {YEARS.map((label, i) => (
              <text
                key={label}
                x={x(i)}
                y={H - 12}
                textAnchor="middle"
                fontSize="11"
                fill="#646b75"
              >
                {label}
              </text>
            ))}

            <path d={areaPath} fill="#10c690" opacity="0.15" />

            {SERIES.map((s) => (
              <g key={s.key}>
                <path
                  d={path(s.values)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.area ? 3 : 2}
                  strokeDasharray={s.dash}
                  strokeLinejoin="round"
                />
                {s.values.map((v, i) => (
                  <circle
                    key={YEARS[i]}
                    cx={x(i)}
                    cy={y(v)}
                    r="4.5"
                    fill={s.area ? s.color : "white"}
                    stroke={s.area ? "white" : s.color}
                    strokeWidth="2"
                  >
                    <title>{`${s.label}・${YEARS[i]}：${v}`}</title>
                  </circle>
                ))}
                {/* 線の終わりに名前を添え、色だけで見分けさせない */}
                <text
                  x={x(YEARS.length - 1) + 10}
                  y={y(s.values[s.values.length - 1]) + 4}
                  fontSize="11"
                  fontWeight="700"
                  fill="#1f2937"
                >
                  {s.label.replace(/（.*）/, "")}
                </text>
              </g>
            ))}
          </svg>

          <details className="text-xs text-mirai-text-secondary">
            <summary className="cursor-pointer font-bold">表で見る</summary>
            <table className="mt-2 w-full text-left">
              <thead>
                <tr>
                  <th className="py-1 pr-2">年</th>
                  {SERIES.map((s) => (
                    <th key={s.key} className="py-1 pr-2">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {YEARS.map((label, i) => (
                  <tr key={label} className="border-line-soft border-t">
                    <td className="py-1 pr-2">{label}</td>
                    {SERIES.map((s) => (
                      <td key={s.key} className="py-1 pr-2 font-lexend">
                        {s.values[i]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </figure>

        <ul className="grid gap-4 md:grid-cols-3">
          {KPIS.map((k) => (
            <li
              key={k.label}
              className="flex flex-col gap-2 rounded-2xl border border-line-soft bg-white p-4 shadow-xs"
            >
              <span className="text-xs font-bold text-mirai-text-muted">
                {k.label}
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className={`font-lexend text-2xl font-bold ${k.tone}`}>
                  {k.value}
                </span>
                <span className="text-xs text-mirai-text-muted">{k.sub}</span>
              </span>
              <span className="border-line-soft border-t pt-2 text-xs text-mirai-text-secondary">
                {k.note}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs leading-relaxed text-mirai-text-muted">
          ※
          この画面は機能のイメージを示すサンプルです。グラフと数字はすべて架空で、実在の条例や議案のものではありません。
        </p>
      </section>
    </RoundCard>
  );
}
