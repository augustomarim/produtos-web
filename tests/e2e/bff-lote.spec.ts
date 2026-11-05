import { test, expect } from "@playwright/test";
test("BFF encaminha PATCH e DELETE com JSON e Bearer para a rota correta", async ({
  request,
}) => {
  const headers = { Authorization: "Bearer bff-test-only" };
  const status = await request.patch("/api/produtos/status", {
    headers,
    data: { ids: [2, 3, 2], status: "inativo" },
  });
  expect(status.status()).toBe(200);
  expect(status.headers()["cache-control"]).toBe("no-store");
  expect(await status.json()).toEqual({
    solicitados: 2,
    afetados: 2,
    produtos: [
      { id: 2, status: "inativo" },
      { id: 3, status: "inativo" },
    ],
  });
  const excluir = await request.delete("/api/produtos", {
    headers,
    data: { ids: [2, 3] },
  });
  expect(excluir.status()).toBe(200);
  expect(await excluir.json()).toEqual({
    solicitados: 2,
    afetados: 2,
    idsExcluidos: [2, 3],
    fotosNaoRemovidas: 0,
  });
});
test("BFF rejeita sem token e JSON malformado e preserva validação do backend", async ({
  request,
}) => {
  expect(
    (
      await request.patch("/api/produtos/status", {
        data: { ids: [1], status: "ativo" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (await request.delete("/api/produtos", { data: { ids: [1] } })).status(),
  ).toBe(401);
  const headers = {
    Authorization: "Bearer bff-test-only",
    "Content-Type": "application/json",
  };
  expect(
    (
      await request.patch("/api/produtos/status", { headers, data: "{" })
    ).status(),
  ).toBe(400);
  expect(
    (await request.delete("/api/produtos", { headers, data: "{" })).status(),
  ).toBe(400);
  expect(
    (
      await request.patch("/api/produtos/status", {
        headers,
        data: { ids: [1], status: "errado" },
      })
    ).status(),
  ).toBe(400);
});
