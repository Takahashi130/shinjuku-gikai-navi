import { explainerFileSchema } from "@mirai-gikai/shared/bill-explainer/schema";
import { describe, expect, it } from "vitest";
import { explainerContentHash } from "./content-hash";
import { explainer } from "./test-fixtures";

describe("explainerContentHash", () => {
  it("中身が同じなら同じ、変われば違うハッシュになる", () => {
    const a = explainerFileSchema.parse(explainer());
    const b = explainerFileSchema.parse(explainer());
    b.version = 5;
    expect(explainerContentHash(a)).toBe(explainerContentHash(b));
    b.body.title = "別の見出し";
    expect(explainerContentHash(a)).not.toBe(explainerContentHash(b));
    expect(explainerContentHash(a)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
