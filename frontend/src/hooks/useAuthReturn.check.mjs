// Check del filtro anti open-redirect e della memoria del ritorno.
// Si esegue a mano: `node src/hooks/useAuthReturn.check.mjs`.
import assert from 'node:assert/strict';
const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
};
globalThis.window = { location: { search: '' } };
const { rememberAuthReturn, __test } = await import('./useAuthReturn.js');
const { resolveAuthReturn } = __test;

assert.equal(resolveAuthReturn(), '/');                    // niente memorizzato
rememberAuthReturn('/bar/abc?x=1');
assert.equal(resolveAuthReturn(), '/bar/abc?x=1');
rememberAuthReturn('/login');                              // le pagine di auth non si memorizzano
rememberAuthReturn('/register?promo=x');
assert.equal(resolveAuthReturn(), '/bar/abc?x=1');
// open redirect: mai fuori dall'app
for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'evil']) {
  store.set('rabar_auth_return', bad);
  assert.equal(resolveAuthReturn(), '/', bad);
}
// redirectTo esplicito nella query vince, ma passa dallo stesso filtro
globalThis.window.location.search = '?redirectTo=/plus';
assert.equal(resolveAuthReturn(), '/plus');
globalThis.window.location.search = '?redirectTo=//evil.com';
assert.equal(resolveAuthReturn(), '/');
console.log('useAuthReturn ok');
