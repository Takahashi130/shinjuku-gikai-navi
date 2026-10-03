import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";
import { footerExternalLinks, footerSiteLinks } from "./footer.config";

describe("footer.config", () => {
  it("規約ページ・開発者向けページ・議案一覧への内部リンクが含まれる", () => {
    const hrefs = footerSiteLinks.map((link) => link.href);

    expect(hrefs).toContain(routes.terms());
    expect(hrefs).toContain(routes.privacy());
    expect(hrefs).toContain(routes.developers());
    expect(hrefs).toContain(routes.billsList());
  });

  it("ヘッダーと同じタブを並べ、まだ無い機能は説明ページへ送る", () => {
    const hrefs = footerSiteLinks.map((link) => link.href);

    expect(hrefs).toContain("/upcoming/live");
    expect(hrefs).toContain("/upcoming/impact");
    expect(hrefs).toContain("/upcoming/members");
  });

  it("内部リンクには external フラグが付かず、外部リンクには付く", () => {
    for (const link of footerSiteLinks) {
      expect(link.href.startsWith("/")).toBe(true);
      expect(link.external).toBeUndefined();
    }
    for (const link of footerExternalLinks) {
      expect(link.href.startsWith("https://")).toBe(true);
      expect(link.external).toBe(true);
    }
  });
});
