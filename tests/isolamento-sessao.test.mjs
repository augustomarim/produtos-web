import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFile } from "node:fs/promises";
const tok = (id, seconds = 900) =>
  `h.${Buffer.from(JSON.stringify({ id, exp: Date.now() / 1000 + seconds })).toString("base64url")}.s`;
let sequence = 0;
async function modules() {
  const sessao = await import(`../src/lib/sessao.ts?isolamento=${++sequence}`);
  const code = ts.transpile(
    await readFile(new URL("../src/lib/api.ts", import.meta.url), "utf8"),
    { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  );
  // Use exactly the same session instance in the real API client.
  const api = await import(
    "data:text/javascript;base64," +
      Buffer.from(
        code.replace(
          '"./sessao"',
          JSON.stringify(
            new URL(
              `../src/lib/sessao.ts?isolamento=${sequence}`,
              import.meta.url,
            ).href,
          ),
        ),
      ).toString("base64")
  );
  return { ...sessao, ...api };
}
test("isolamento de respostas e renovação entre contas", async (t) => {
  const original = globalThis.fetch;
  try {
    await t.test(
      "resposta da conta A em andamento é descartada após login B",
      async () => {
        const m = await modules();
        m.guardarAccessToken(tok(1));
        let release;
        let started;
        const sent = new Promise((resolve) => {
          started = resolve;
        });
        globalThis.fetch = () =>
          new Promise((resolve) => {
            release = () => resolve(Response.json({ produtos: ["segredo A"] }));
            started();
          });
        const pending = m.apiAutenticada("/api/produtos");
        await sent;
        m.limparSessao();
        m.guardarAccessToken(tok(2));
        release();
        await assert.rejects(pending, m.SessaoAlteradaError);
      },
    );
    await t.test(
      "renovação de outra conta não retorna token B à operação da conta A",
      async () => {
        const m = await modules();
        m.guardarAccessToken(tok(1, 5));
        globalThis.fetch = async () => Response.json({ token: tok(2) });
        await assert.rejects(m.renovarSessao(), m.SessaoAlteradaError);
      },
    );
    await t.test(
      "renovação da mesma conta mantém a operação válida",
      async () => {
        const m = await modules();
        m.guardarAccessToken(tok(1, 5));
        let calls = 0;
        globalThis.fetch = async () =>
          ++calls === 1
            ? Response.json({ token: tok(1) })
            : Response.json({ produtos: ["da conta A"] });
        assert.deepEqual(await m.apiAutenticada("/api/produtos"), {
          produtos: ["da conta A"],
        });
      },
    );
  } finally {
    globalThis.fetch = original;
  }
});
