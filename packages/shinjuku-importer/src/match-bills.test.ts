import { describe, expect, it } from "vitest";
import { matchBills, normalizeName } from "./match-bills";
import type { ResultRow } from "./parse-results-pdf";
import type { SessionBill } from "./parse-session-page";

const row = (name: string): ResultRow => ({ name, summary: "", votes: {}, result: "可決" });
const bill = (label: string, name: string): SessionBill => ({ kind: "mayor", number: 1, label, name });

describe("normalizeName", () => {
  it("ローマ数字・全角・空白の表記ゆれをそろえる", () => {
    expect(normalizeName("江戸川橋通り第Ⅰ期 （その２）")).toBe(normalizeName("江戸川橋通り第1期（その2）"));
  });
});

describe("matchBills", () => {
  it("同名の議案は出現順に対応づける", () => {
    const bills = [bill("承認第2号", "専決処分の承認について"), bill("承認第3号", "専決処分の承認について")];
    const { matched } = matchBills(bills, [row("専決処分の承認について（第2号）"), row("専決処分の承認について（第３号）")]);
    expect(matched.map((m) => m.label)).toEqual(["承認第2号", "承認第3号"]);
  });

  it("対応する議案がない行を返す", () => {
    const { matched, unmatchedRows } = matchBills([bill("第1号議案", "条例A")], [row("条例A"), row("条例B")]);
    expect(matched).toHaveLength(1);
    expect(unmatchedRows.map((r) => r.name)).toEqual(["条例B"]);
  });
});
