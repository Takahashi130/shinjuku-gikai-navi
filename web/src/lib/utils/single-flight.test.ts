import { describe, expect, it } from "vitest";
import { singleFlight } from "./single-flight";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("singleFlight", () => {
  it("実行中に呼ばれたら、同じ結果を待つ（処理は1回だけ）", async () => {
    let calls = 0;
    const gate = deferred<string>();
    const run = singleFlight(() => {
      calls += 1;
      return gate.promise;
    });

    const a = run();
    const b = run();
    gate.resolve("user-1");

    await expect(a).resolves.toBe("user-1");
    await expect(b).resolves.toBe("user-1");
    expect(calls).toBe(1);
  });

  it("終わったあとの呼び出しは、また実行する", async () => {
    let calls = 0;
    const run = singleFlight(async () => {
      calls += 1;
      return calls;
    });

    await expect(run()).resolves.toBe(1);
    await expect(run()).resolves.toBe(2);
  });

  it("失敗しても、次の呼び出しでやり直せる", async () => {
    let calls = 0;
    const run = singleFlight(async () => {
      calls += 1;
      if (calls === 1) throw new Error("boom");
      return "ok";
    });

    await expect(run()).rejects.toThrow("boom");
    await expect(run()).resolves.toBe("ok");
  });

  it("同時の呼び出しは、失敗も同じものを受け取る", async () => {
    const gate = deferred<string>();
    const run = singleFlight(() => gate.promise);
    const a = run();
    const b = run();
    gate.reject(new Error("network"));

    await expect(a).rejects.toThrow("network");
    await expect(b).rejects.toThrow("network");
  });
});
