import { getDocumentProxy } from "unpdf";
import type { RuleLines, TextItem } from "./parse-results-pdf";

// pdf.js の OPS.constructPath
const OP_CONSTRUCT_PATH = 91;

export type PdfPage = { items: TextItem[]; rules: RuleLines };

/** PDF の各ページから、文字（座標つき）と罫線を取り出す */
export async function loadPdfPages(data: Uint8Array): Promise<PdfPage[]> {
  const pdf = await getDocumentProxy(data);
  const pages: PdfPage[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      items.push({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
      });
    }

    const ops = await page.getOperatorList();
    const rules: RuleLines = { horizontal: [], vertical: [], horizontalSegments: [] };
    ops.fnArray.forEach((fn, k) => {
      if (fn !== OP_CONSTRUCT_PATH) return;
      const minMax = ops.argsArray[k]?.[2];
      if (!minMax) return;
      const [x0, y0, x1, y1] = Array.from(minMax as ArrayLike<number>);
      const w = x1 - x0;
      const h = y1 - y0;
      if (h < 2 && w > 50) {
        rules.horizontal.push(y0);
        rules.horizontalSegments?.push({ y: y0, x0, x1 });
      }
      else if (w < 2 && h > 10) rules.vertical.push(x0);
    });
    pages.push({ items, rules });
  }
  return pages;
}
