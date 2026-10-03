import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";
import { footerColumns } from "./footer.config";

const allLinks = footerColumns.flatMap((column) => column.links);

describe("footer.config", () => {
  it("規約ページと開発者向けページへの内部リンクが含まれる", () => {
    const hrefs = allLinks.map((link) => link.href);

    expect(hrefs).toContain(routes.terms());
    expect(hrefs).toContain(routes.privacy());
    expect(hrefs).toContain(routes.developers());
    expect(hrefs).toContain(routes.billsList());
    expect(hrefs).toContain(routes.membersList());
  });

  it("内部リンクには external フラグが付かず、外部リンクには付く", () => {
    for (const link of allLinks) {
      if (link.href.startsWith("/")) {
        expect(link.external).toBeUndefined();
      } else {
        expect(link.external).toBe(true);
      }
    }
  });

  it("どの列にもリンクがある", () => {
    for (const column of footerColumns) {
      expect(column.links.length).toBeGreaterThan(0);
    }
  });
});
