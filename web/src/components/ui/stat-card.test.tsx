// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { Route } from "next";
import { describe, expect, it } from "vitest";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("数字を3桁ごとに区切って単位と出す", () => {
    const { container } = render(
      <StatCard label="掲載している議案" value={1234} unit="件" />
    );

    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(container).toHaveTextContent("掲載している議案1,234件");
  });

  it("行き先があるときだけカード全体をリンクにする", () => {
    const { rerender } = render(<StatCard label="審議中の議案" value={28} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(
      <StatCard
        label="審議中の議案"
        value={28}
        href={"/bills?status=deliberating" as Route}
        linkLabel="審議中の議案を見る"
      />
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/bills?status=deliberating"
    );
    expect(screen.getByText("審議中の議案を見る")).toBeInTheDocument();
  });

  // 「審議中の議案28件…審議中の議案を見る」と同じ語を2回読ませない。
  it("リンクの名前に末尾の文言を含めない", () => {
    render(
      <StatCard
        label="審議中の議案"
        value={28}
        unit="件"
        href={"/bills?status=deliberating" as Route}
        linkLabel="審議中の議案を見る"
      />
    );

    expect(screen.getByRole("link")).toHaveAccessibleName("審議中の議案28件");
  });
});
