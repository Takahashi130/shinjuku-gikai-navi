import { describe, expect, it } from "vitest";
import { normalizeIpForRateLimit } from "./normalize-ip-for-rate-limit";

describe("normalizeIpForRateLimit", () => {
  it("IPv4 はそのまま返す", () => {
    expect(normalizeIpForRateLimit("203.0.113.7")).toBe("203.0.113.7");
    expect(normalizeIpForRateLimit(" 203.0.113.7 ")).toBe("203.0.113.7");
  });

  it("ポート付きの IPv4 はポートを外す", () => {
    expect(normalizeIpForRateLimit("203.0.113.7:443")).toBe("203.0.113.7");
  });

  it("IPv6 は先頭の 64 ビットに丸める", () => {
    expect(
      normalizeIpForRateLimit("2001:db8:1234:5678:aaaa:bbbb:cccc:dddd")
    ).toBe("2001:0db8:1234:5678::/64");
  });

  it("同じ /64 の中でアドレスを変えても同じ値になる", () => {
    const a = normalizeIpForRateLimit("2001:db8:1:2::1");
    const b = normalizeIpForRateLimit("2001:DB8:1:2:ffff:ffff:ffff:fffe");
    expect(a).toBe(b);
    expect(a).toBe("2001:0db8:0001:0002::/64");
  });

  it("/64 が違えば別の値になる", () => {
    expect(normalizeIpForRateLimit("2001:db8:1:2::1")).not.toBe(
      normalizeIpForRateLimit("2001:db8:1:3::1")
    );
  });

  it("省略（::）・ゾーン ID・角かっことポートを読む", () => {
    expect(normalizeIpForRateLimit("::1")).toBe("0000:0000:0000:0000::/64");
    expect(normalizeIpForRateLimit("fe80::1%eth0")).toBe(
      "fe80:0000:0000:0000::/64"
    );
    expect(normalizeIpForRateLimit("[2001:db8::1]:443")).toBe(
      "2001:0db8:0000:0000::/64"
    );
  });

  it("IPv4 射影アドレスは IPv4 にする", () => {
    expect(normalizeIpForRateLimit("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(normalizeIpForRateLimit("::ffff:cb00:7107")).toBe("203.0.113.7");
  });

  it("読めない値は小文字にして返す", () => {
    expect(normalizeIpForRateLimit("Unknown")).toBe("unknown");
    expect(normalizeIpForRateLimit("1:2:3")).toBe("1:2:3");
    expect(normalizeIpForRateLimit("1::2::3")).toBe("1::2::3");
  });
});
