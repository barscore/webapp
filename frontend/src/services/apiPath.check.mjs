// Check del filtro sui path dell'API. Si esegue a mano: `node src/services/apiPath.check.mjs`.
import assert from 'node:assert/strict';
import { assertSafeApiPath } from './apiPath.js';

for (const ok of [
  '/bars/3f2b9c1e-1111-4111-8111-111111111111',
  '/bars/osm_node_123/drinks',
  '/events/abc/prs/def/approve',
  '/places/nearby?lat=46.1&lng=11.1',
  '/me',
]) assert.doesNotThrow(() => assertSafeApiPath(ok), ok);

for (const bad of [
  '/bars/../../me/export',
  '/bars/..',
  '/bars/./x',
  '/bars/%2e%2e/drinks',
  '/bars/.%2E/drinks',
  '/bars/.\t./me',
  '/bars/a b',
  '/bars/..\\me',
  '/bars/abc#x',
]) assert.throws(() => assertSafeApiPath(bad), Error, JSON.stringify(bad));

console.log('apiPath ok');
