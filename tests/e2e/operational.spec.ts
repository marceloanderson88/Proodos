import { expect, test } from "@playwright/test";

test("liveness não expõe dados e entrega headers de segurança", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    status: "ok",
    service: "proodos-web",
  });
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-request-id"]).toBeTruthy();
});

test("readiness confirma Data API e banco sem retornar detalhes internos", async ({
  request,
}) => {
  const response = await request.get("/api/ready");
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    status: "ready",
    dependencies: { database: "ok" },
  });
});

test("mutação sem Origin confiável é bloqueada antes da autenticação", async ({
  request,
}) => {
  const response = await request.post("/api/v1/files/upload-session", {
    data: {},
  });
  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ code: "untrusted_origin" });
});
