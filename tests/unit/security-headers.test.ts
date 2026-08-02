import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  getSecurityHeaders,
} from "@/lib/security/headers";

describe("security headers", () => {
  it("nega frames, objetos e origens genéricas", () => {
    const policy = buildContentSecurityPolicy();
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("habilita unsafe-eval apenas no desenvolvimento", () => {
    expect(buildContentSecurityPolicy({ development: true })).toContain(
      "'unsafe-eval'",
    );
  });

  it("inclui controles de framing, MIME e permissões", () => {
    const headers = new Map(
      getSecurityHeaders().map(({ key, value }) => [key, value]),
    );
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
