import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

let sequence = 0;
async function modulo() { return import(`../src/lib/sessao.ts?teste=${++sequence}`); }

test('renovação da sessão', async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalFetch = globalThis.fetch;
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    await t.test('chamadas simultâneas na mesma aba compartilham uma requisição', async () => {
      let requests = 0;
      globalThis.fetch = async () => { requests++; await setTimeout(10); return Response.json({ token: 'access-test' }); };
      const { renovarSessao } = await modulo();
      assert.deepEqual(await Promise.all([renovarSessao(), renovarSessao()]), ['access-test', 'access-test']);
      assert.equal(requests, 1);
    });
    await t.test('abas diferentes aguardam o mesmo Web Lock', async () => {
      let queue = Promise.resolve(), active = 0, maximum = 0, cookie = 0;
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: {
        request(name, callback) { assert.equal(name, 'produtos:refresh'); const result = queue.then(callback); queue = result.catch(() => {}); return result; },
      } } });
      globalThis.fetch = async () => {
        const receivedCookie = cookie;
        active++; maximum = Math.max(maximum, active);
        await setTimeout(10);
        active--;
        if (receivedCookie !== cookie) return Response.json({}, { status: 401 });
        cookie++;
        return Response.json({ token: `access-${cookie}` });
      };
      const abaA = await modulo(), abaB = await modulo();
      assert.deepEqual(await Promise.all([abaA.renovarSessao(), abaB.renovarSessao()]), ['access-1', 'access-2']);
      assert.equal(maximum, 1);
    });
    await t.test('401 distingue sessão expirada e permite nova tentativa', async () => {
      globalThis.fetch = async () => Response.json({}, { status: 401 });
      const m = await modulo();
      await assert.rejects(m.renovarSessao(), m.SessaoExpiradaError);
      globalThis.fetch = async () => Response.json({ token: 'novo-access' });
      assert.equal(await m.renovarSessao(), 'novo-access');
    });
    await t.test('indisponibilidade não é tratada como sessão expirada', async () => {
      globalThis.fetch = async () => Response.json({}, { status: 502 });
      const m = await modulo();
      await assert.rejects(m.renovarSessao(), error => error instanceof Error && !(error instanceof m.SessaoExpiradaError));
    });
    await t.test('resposta sem access token é rejeitada', async () => {
      globalThis.fetch = async () => Response.json({ token: 123 });
      const m = await modulo();
      await assert.rejects(m.renovarSessao(), /Resposta de autenticação inválida/);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  }
});
