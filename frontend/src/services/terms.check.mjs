// Check della spunta portata attraverso il redirect OAuth e delle pagine che
// restano leggibili sotto TermsGate.
// Si esegue a mano: `node src/services/terms.check.mjs`.
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};
const { rememberTermsTick, hasTermsTick, clearTermsTick, termsGateOpen } = await import('./terms.js');

const T0 = 1_800_000_000_000;
const MIN = 60 * 1000;

assert.equal(hasTermsTick(T0), false);                 // niente spuntato
rememberTermsTick(T0);
assert.equal(hasTermsTick(T0 + 5 * 1000), true);       // ritorno da Google
assert.equal(hasTermsTick(T0 + 29 * MIN), true);
assert.equal(hasTermsTick(T0 + 30 * MIN), false);      // scaduta: non vale per un altro accesso
assert.equal(hasTermsTick(T0 - 1), false);             // orologio tornato indietro
clearTermsTick();
assert.equal(hasTermsTick(T0 + 1), false);

// valori che non sono un istante non valgono come spunta
for (const bad of ['', 'abc', 'NaN', 'Infinity', 'true']) {
  store.set('rabar_terms_tick', bad);
  assert.equal(hasTermsTick(T0), false, bad);
}

// il gate copre tutto tranne i documenti da leggere prima di accettare
assert.equal(termsGateOpen(true, '/'), true);
assert.equal(termsGateOpen(true, '/impostazioni'), true);
assert.equal(termsGateOpen(true, '/privacy'), false);
assert.equal(termsGateOpen(true, '/tos'), false);
assert.equal(termsGateOpen(false, '/'), false);
console.log('terms ok');
