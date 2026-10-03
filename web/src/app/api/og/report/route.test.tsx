import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND_COLORS } from "@/config/brand-colors";
import { SITE } from "@/config/site";
import { getReportOgData } from "@/features/interview-report/server/loaders/get-report-og-data";
import { GET } from "./route";

type StyledElementProps = {
  children?: ReactNode;
  style?: Record<string, unknown>;
};

const mocks = vi.hoisted(() => ({
  getReportOgData: vi.fn(),
  imageResponse: vi.fn(
    (element: ReactElement, _init: ConstructorParameters<typeof Response>[1]) =>
      new Response(JSON.stringify(element), { status: 200 })
  ),
}));

vi.mock(
  "@/features/interview-report/server/loaders/get-report-og-data",
  () => ({
    getReportOgData: mocks.getReportOgData,
  })
);

vi.mock("next/og", () => ({
  ImageResponse: mocks.imageResponse,
}));

function findBillNameElement(
  node: ReactNode,
  text: string
): ReactElement<StyledElementProps> | null {
  if (!node || typeof node !== "object" || !("props" in node)) {
    return null;
  }

  const element = node as ReactElement<StyledElementProps>;
  if (
    element.props.children === text &&
    element.props.style?.color === BRAND_COLORS.link
  ) {
    return element;
  }

  const children = element.props.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findBillNameElement(child, text);
      if (found) return found;
    }
    return null;
  }

  return findBillNameElement(children, text);
}

async function renderOgElement(billName: string): Promise<ReactElement> {
  vi.mocked(getReportOgData).mockResolvedValue({
    summary: "試験打上げまで許可対象を広げるなら、手続きはシンプルにしてほしい",
    billName,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 500 }))
  );

  await GET(new Request("http://localhost/api/og/report?id=report-1"));

  expect(mocks.imageResponse).toHaveBeenCalledTimes(1);
  return mocks.imageResponse.mock.calls[0][0];
}

describe("GET /api/og/report", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("サイトの配色（濃色の地・アクセントのバッジ）で描き、バッジにサービス名を出す", async () => {
    const element = await renderOgElement("議案名");
    const json = JSON.stringify(element);

    expect(element.props).toMatchObject({
      style: { backgroundColor: BRAND_COLORS.header },
    });
    expect(json).toContain(`"backgroundColor":"${BRAND_COLORS.accent}"`);
    expect(json).toContain(`"children":"${SITE.NAME}"`);
  });

  // 元のソフトウェアのブランドの配色（ミントのグラデーション）を使わない。
  it("元のブランドのグラデーションの色を含まない", async () => {
    const json = JSON.stringify(await renderOgElement("議案名"));

    expect(json).not.toMatch(/100,\s*216,\s*198|188,\s*236,\s*211/);
    expect(json).not.toMatch(/#64d8c6|#bcecd3/i);
  });

  it("長い議案名をロゴ領域に重ならない幅で描画する", async () => {
    const billName =
      "ロケットの打上げルールを見直して、日本の宇宙産業を強化するための議案";
    const element = await renderOgElement(billName);
    const billNameElement = findBillNameElement(element, billName);

    expect(billNameElement?.props.style).toMatchObject({
      width: 820,
      maxHeight: 96,
      overflow: "hidden",
      wordBreak: "break-all",
    });
  });
});
