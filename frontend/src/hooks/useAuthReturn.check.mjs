// Check del filtro anti open-redirect e della memoria del ritorno.
// Si esegue a mano: `node src/hooks/useAuthReturn.check.mjs`.
import assert from 'node:assert/strict';
const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};
globalThis.window = { location: { search: '' } };
const { rememberAuthReturn, rememberPendingAuthReturn, takePendingAuthReturn, __test } = await import(
  './useAuthReturn.js'
);
const { resolveAuthReturn } = __test;

assert.equal(resolveAuthReturn(), '/');                    // niente memorizzato
rememberAuthReturn('/bar/abc?x=1');
assert.equal(resolveAuthReturn(), '/bar/abc?x=1');
rememberAuthReturn('/login');                              // le pagine di auth non si memorizzano
rememberAuthReturn('/register?promo=x');
assert.equal(resolveAuthReturn(), '/bar/abc?x=1');
// open redirect: mai fuori dall'app
for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'evil', '/\t/evil.com', '/\n/evil.com', '/\r//evil.com', ' //evil.com', '/ /evil.com']) {
  store.set('rabar_auth_return', bad);
  assert.equal(resolveAuthReturn(), '/', bad);
}
// redirectTo esplicito nella query vince, ma passa dallo stesso filtro
globalThis.window.location.search = '?redirectTo=/plus';
assert.equal(resolveAuthReturn(), '/plus');
globalThis.window.location.search = '?redirectTo=//evil.com';
assert.equal(resolveAuthReturn(), '/');
globalThis.window.location.search = '?redirectTo=/%09/evil.com';         // TAB: il parser lo toglie
assert.equal(resolveAuthReturn(), '/');
globalThis.window.location.search = '?redirectTo=/bar/abc%3Fx%3D1';      // path codificato vero
assert.equal(resolveAuthReturn(), '/bar/abc?x=1');
// ritorno promesso al giro OAuth: si legge una volta sola, filtrato, e scade
assert.equal(takePendingAuthReturn(), null);
rememberPendingAuthReturn('/bar/abc');
rememberAuthReturn('/');                                   // l'atterraggio in home non lo tocca
assert.equal(takePendingAuthReturn(), '/bar/abc');
assert.equal(takePendingAuthReturn(), null);
rememberPendingAuthReturn('//evil.com');
assert.equal(takePendingAuthReturn(), '/');
store.set('rabar_auth_pending', JSON.stringify({ path: '/bar/abc', at: Date.now() - 16 * 60 * 1000 }));
assert.equal(takePendingAuthReturn(), null);
store.set('rabar_auth_pending', 'non-json');
assert.equal(takePendingAuthReturn(), null);
console.log('useAuthReturn ok');
