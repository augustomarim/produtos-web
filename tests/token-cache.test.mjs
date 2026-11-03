import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
const token = (exp) =>
  `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
let sequence = 0;
const modulo = () => import(`../src/lib/sessao.ts?cache=${++sequence}`);
test("cache do access token e invalidação", async (t) => {
  const fetchOriginal = globalThis.fetch;
  try {
    await t.test(
      "token válido do login elimina refresh por operação",
      async () => {
        const m = await modulo();
        let chamadas = 0;
        globalThis.fetch = async () => {
          chamadas++;
          return Response.json({ token: token(Date.now() / 1000 + 900) });
        };
        const atual = token(Date.now() / 1000 + 600);
        m.guardarAccessToken(atual);
        assert.equal(await m.renovarSessao(), atual);
        assert.equal(await m.renovarSessao(), atual);
        assert.equal(chamadas, 0);
      },
    );
    await t.test(
      "token próximo de expirar renova uma vez e guarda o resultado",
      async () => {
        const m = await modulo();
        let chamadas = 0;
        const novo = token(Date.now() / 1000 + 900);
        globalThis.fetch = async () => {
          chamadas++;
          await setTimeout(5);
          return Response.json({ token: novo });
        };
        m.guardarAccessToken(token(Date.now() / 1000 + 10));
        assert.deepEqual(
          await Promise.all([m.renovarSessao(), m.renovarSessao()]),
          [novo, novo],
        );
        assert.equal(await m.renovarSessao(), novo);
        assert.equal(chamadas, 1);
      },
    );
    await t.test("401 atrasado não invalida um token mais novo", async () => {
      const m = await modulo();
      const antigo = token(Date.now() / 1000 + 100),
        novo = token(Date.now() / 1000 + 900);
      m.guardarAccessToken(novo);
      m.invalidarAccessToken(antigo);
      assert.equal(await m.renovarSessao(), novo);
    });
    await t.test(
      "logout impede que uma renovação em andamento restaure o token",
      async () => {
        const m = await modulo();
        let liberar;
        globalThis.fetch = () =>
          new Promise((resolve) => {
            liberar = () =>
              resolve(Response.json({ token: token(Date.now() / 1000 + 900) }));
          });
        const pending = m.renovarSessao();
        while (!liberar) await setTimeout(1);
        m.limparSessao();
        liberar();
        await assert.rejects(pending, m.SessaoExpiradaError);
      },
    );
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
