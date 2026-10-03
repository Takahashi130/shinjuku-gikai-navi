import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IMPORTER_FORBIDDEN_TABLES, IMPORTER_WRITABLE_TABLES } from "./writable-tables";

const srcDir = import.meta.dirname;

function sourceFiles(): string[] {
  return readdirSync(srcDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
}

describe("IMPORTER_WRITABLE_TABLES", () => {
  it("取り込み処理が触るテーブルは一覧に入っているものだけ", () => {
    const used = new Set<string>();
    for (const file of sourceFiles()) {
      const code = readFileSync(join(srcDir, file), "utf8");
      for (const m of code.matchAll(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(0);
    for (const table of used) {
      expect(IMPORTER_WRITABLE_TABLES as readonly string[], table).toContain(table);
    }
  });

  it("運営者・区民が作るデータのテーブルは一覧に入れない", () => {
    for (const table of IMPORTER_FORBIDDEN_TABLES) {
      expect(IMPORTER_WRITABLE_TABLES as readonly string[]).not.toContain(table);
    }
  });

  it("polls は追加（重複は無視）と、日程由来でまだ締切の来ていない回の締切の更新だけを行う", () => {
    const code = sourceFiles()
      .map((f) => readFileSync(join(srcDir, f), "utf8"))
      .join("\n");
    const pollWrites = [...code.matchAll(/\.from\("polls"\)([\s\S]*?);/g)].map((m) => m[1]);
    expect(pollWrites.length).toBeGreaterThan(0);
    expect(pollWrites.some((w) => w.includes(".update("))).toBe(true);
    for (const write of pollWrites) {
      expect(write).not.toMatch(/\.delete\(/);
      if (write.includes(".upsert(")) expect(write).toContain("ignoreDuplicates: true");
      if (write.includes(".update(")) {
        expect(write).toContain('.eq("closes_at_source", "schedule")');
        // 締切が未設定か、まだ来ていない回だけ（締切を過ぎた回は採決前・後の区分が変わるので触らない）
        expect(write).toContain(".or(updatableScheduleCloseFilter(");
        // 更新するのは締切だけ
        expect(write).toMatch(/\.update\(\{ closes_at: [a-zA-Z]+ \}\)/);
      }
    }
  });
});
