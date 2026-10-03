import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      aria-label="パンくずリスト"
      className="flex flex-wrap items-center gap-2 text-sm text-mirai-text-secondary"
    >
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4" aria-hidden />}
          {item.href ? (
            /* 文字の高さのままだと押しにくいので、行の高さを変えずに押せる範囲を上下に広げる */
            <Link
              href={item.href as Route}
              className="-my-3 py-3 hover:text-brand-link hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
