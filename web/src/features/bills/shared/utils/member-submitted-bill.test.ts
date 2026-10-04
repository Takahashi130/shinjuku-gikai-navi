import { describe, expect, it } from "vitest";
import { isMemberSubmittedBillSlug } from "./member-submitted-bill";

describe("isMemberSubmittedBillSlug", () => {
  it("slug が …-giin-N の議案だけを議員提出議案とする", () => {
    expect(isMemberSubmittedBillSlug("r8-teirei-2-giin-10")).toBe(true);
    expect(isMemberSubmittedBillSlug("r8-teirei-3-gian-63")).toBe(false);
    expect(isMemberSubmittedBillSlug("r8-teirei-3-giin-x")).toBe(false);
    expect(isMemberSubmittedBillSlug(null)).toBe(false);
    expect(isMemberSubmittedBillSlug(undefined)).toBe(false);
  });
});
