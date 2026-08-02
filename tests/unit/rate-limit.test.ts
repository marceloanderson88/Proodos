import { describe, expect, it } from "vitest";

import { FixedWindowRateLimiter } from "@/lib/security/rate-limit";

describe("FixedWindowRateLimiter", () => {
  it("bloqueia excesso e reabre a janela depois do prazo", () => {
    const limiter = new FixedWindowRateLimiter();
    const policy = { limit: 2, windowMs: 1_000 };
    expect(limiter.consume("tenant:user", policy, 0).allowed).toBe(true);
    expect(limiter.consume("tenant:user", policy, 10).allowed).toBe(true);
    expect(limiter.consume("tenant:user", policy, 20).allowed).toBe(false);
    expect(limiter.consume("tenant:user", policy, 1_001).allowed).toBe(true);
  });
});
