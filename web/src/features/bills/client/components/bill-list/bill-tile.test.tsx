// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMockBill,
  createMockBillContent,
} from "@/app/dev/_lib/mock-data";
import { BillTile } from "./bill-tile";

describe("BillTile", () => {
  it("タイル全体が議案の詳細へのリンクになり、タイトルを見出しにする", () => {
    render(
      <BillTile
        bill={createMockBill({
          id: "bill-1",
          bill_content: createMockBillContent({ title: "保育料の議案" }),
        })}
      />
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/bills/bill-1");
    expect(
      screen.getByRole("heading", { name: "保育料の議案" })
    ).toBeInTheDocument();
  });

  it("タイトルが無ければ正式名称を見出しにする", () => {
    render(
      <BillTile
        bill={createMockBill({ name: "正式名称", bill_content: undefined })}
      />
    );

    expect(
      screen.getByRole("heading", { name: "正式名称" })
    ).toBeInTheDocument();
  });

  it("会派の賛否が分かれた議案にだけ目印を付ける", () => {
    const { rerender } = render(
      <BillTile bill={createMockBill({ is_featured: false })} />
    );
    expect(screen.queryByText("賛否が分かれた")).not.toBeInTheDocument();

    rerender(<BillTile bill={createMockBill({ is_featured: true })} />);
    expect(screen.getByText("賛否が分かれた")).toBeInTheDocument();
  });
});
