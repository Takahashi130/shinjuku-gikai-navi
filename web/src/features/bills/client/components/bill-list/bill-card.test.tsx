// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMockBill,
  createMockBillContent,
} from "@/app/dev/_lib/mock-data";
import { BillCard } from "./bill-card";

describe("BillCard", () => {
  // カード全体を <a> にすると、リンクの名前が要約やテーマまでつながった長い文になる。
  it("議案名を詳細へのリンクにし、リンクの名前は議案名だけにする", () => {
    render(
      <BillCard
        bill={createMockBill({
          id: "bill-gasoline",
          tags: [{ id: "zeikin", label: "税金" }],
          bill_content: createMockBillContent({
            title: "ガソリン税を下げる議案",
            summary: "税金を下げます。",
          }),
        })}
      />
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/bills/bill-gasoline");
    expect(link).toHaveAccessibleName("ガソリン税を下げる議案");
  });

  // 一覧では何の議案かが読めないと選べないので、タイトルは省略しない。
  it("長いタイトルも省略せずに出す", () => {
    const title =
      "地方公共団体の議会の議員及び長の選挙に係る公職選挙法の特例に関する法律の一部を改正する法律案";
    render(
      <BillCard
        bill={createMockBill({
          bill_content: createMockBillContent({ title }),
        })}
      />
    );

    expect(screen.getByRole("heading")).toHaveTextContent(title);
  });

  it("タイトルが無ければ正式名称を見出しにする", () => {
    render(
      <BillCard
        bill={createMockBill({
          name: "学校給食法の一部を改正する法律案",
          bill_content: undefined,
          is_review_completed: false,
        })}
      />
    );

    expect(
      screen.getByRole("heading", { name: "学校給食法の一部を改正する法律案" })
    ).toBeInTheDocument();
  });

  it("概要があれば添え、無ければ何も出さない", () => {
    const { rerender } = render(
      <BillCard
        bill={createMockBill({
          bill_content: createMockBillContent({ summary: "税金を下げます。" }),
        })}
      />
    );
    expect(screen.getByText("税金を下げます。")).toBeInTheDocument();

    rerender(<BillCard bill={createMockBill({ bill_content: undefined })} />);
    expect(screen.queryByText("税金を下げます。")).not.toBeInTheDocument();
  });

  // 分野ごとの共通の絵は情報を増やすだけなので、カードには出さない。
  it("サムネイルは出さない", () => {
    const { container } = render(
      <BillCard
        bill={createMockBill({
          thumbnail_url: "https://example.com/thumb.png",
        })}
      />
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("ステータスをピルで出す", () => {
    render(<BillCard bill={createMockBill({ status: "enacted" })} />);

    expect(screen.getByText("可決")).toBeInTheDocument();
  });

  it("提出日があるときだけ日付を出す", () => {
    const { rerender } = render(
      <BillCard bill={createMockBill({ submitted_date: "2026-02-03" })} />
    );
    expect(screen.getByText("2026.2.3 提出")).toBeInTheDocument();

    rerender(<BillCard bill={createMockBill({ submitted_date: null })} />);
    expect(
      screen.queryByText(/^\d{4}\.\d+\.\d+ 提出$/)
    ).not.toBeInTheDocument();
  });

  it("会派の賛否が分かれた議案にだけ目印を付ける", () => {
    const { rerender } = render(
      <BillCard bill={createMockBill({ is_featured: false })} />
    );
    expect(screen.queryByText("賛否が分かれた")).not.toBeInTheDocument();

    rerender(<BillCard bill={createMockBill({ is_featured: true })} />);
    expect(screen.getByText("賛否が分かれた")).toBeInTheDocument();
  });

  it("タグと受付中を下の段に並べ、無ければ出さない", () => {
    const { rerender } = render(
      <BillCard
        bill={createMockBill({
          tags: [{ id: "zeikin", label: "税金" }],
          hasPublicInterview: true,
        })}
      />
    );
    expect(screen.getByText("税金")).toBeInTheDocument();
    expect(screen.getByText("AIインタビュー受付中")).toBeInTheDocument();

    rerender(
      <BillCard
        bill={createMockBill({
          tags: [],
          hasPublicInterview: false,
          publicReportCount: 0,
        })}
      />
    );
    expect(screen.queryByText("AIインタビュー受付中")).not.toBeInTheDocument();
  });

  // 0人と書くと参加をためらわせるので、集まっている議案にだけ数字を出す。
  it("回答が集まっている議案にだけ回答数を出す", () => {
    const { rerender } = render(
      <BillCard bill={createMockBill({ publicReportCount: 0 })} />
    );
    expect(
      screen.queryByText(/人がAIインタビューに回答/)
    ).not.toBeInTheDocument();

    rerender(<BillCard bill={createMockBill({ publicReportCount: 12 })} />);
    expect(screen.getByText("12人がAIインタビューに回答")).toBeInTheDocument();
  });

  it("レビュー完了のときだけ完了バッジを添える", () => {
    const { rerender } = render(
      <BillCard bill={createMockBill({ is_review_completed: false })} />
    );
    expect(
      screen.queryByRole("img", { name: "レビュー完了" })
    ).not.toBeInTheDocument();

    rerender(<BillCard bill={createMockBill({ is_review_completed: true })} />);
    expect(
      screen.getByRole("img", { name: "レビュー完了" })
    ).toBeInTheDocument();
  });
});
