import { describe, expect, it } from "vitest";
import {
  isEligibleForAudience,
  isPollAudience,
  resolveEligibility,
} from "./resolve-eligibility";

describe("resolveEligibility", () => {
  it("何も確かめていなければ unverified（今の A 案）", () => {
    expect(resolveEligibility({})).toBe("unverified");
    expect(resolveEligibility({ residencyClaim: null })).toBe("unverified");
  });

  it("区民認証が済んでいれば verified_resident", () => {
    expect(
      resolveEligibility({ verifiedResident: true, residencyClaim: null })
    ).toBe("verified_resident");
  });

  it("区民認証は自己申告より優先する", () => {
    expect(
      resolveEligibility({
        verifiedResident: true,
        residencyClaim: "nonresident",
      })
    ).toBe("verified_resident");
  });

  it("自己申告は self_declared_* にする", () => {
    expect(resolveEligibility({ residencyClaim: "resident" })).toBe(
      "self_declared_resident"
    );
    expect(resolveEligibility({ residencyClaim: "nonresident" })).toBe(
      "self_declared_nonresident"
    );
  });
});

describe("isEligibleForAudience", () => {
  it("anyone は誰でも参加できる", () => {
    expect(isEligibleForAudience("anyone", "unverified")).toBe(true);
    expect(isEligibleForAudience("anyone", "self_declared_nonresident")).toBe(
      true
    );
  });

  it("resident_declared は区民の自己申告か区民認証が必要", () => {
    expect(isEligibleForAudience("resident_declared", "unverified")).toBe(
      false
    );
    expect(
      isEligibleForAudience("resident_declared", "self_declared_nonresident")
    ).toBe(false);
    expect(
      isEligibleForAudience("resident_declared", "self_declared_resident")
    ).toBe(true);
    expect(
      isEligibleForAudience("resident_declared", "verified_resident")
    ).toBe(true);
  });

  it("resident_verified は区民認証が必要", () => {
    expect(
      isEligibleForAudience("resident_verified", "self_declared_resident")
    ).toBe(false);
    expect(
      isEligibleForAudience("resident_verified", "verified_resident")
    ).toBe(true);
  });
});

describe("isPollAudience", () => {
  it("決められた値だけを受け付ける", () => {
    expect(isPollAudience("anyone")).toBe(true);
    expect(isPollAudience("resident_verified")).toBe(true);
    expect(isPollAudience("everyone")).toBe(false);
  });
});
