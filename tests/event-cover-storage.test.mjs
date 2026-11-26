import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
import { EventCoverError } from '../lib/event-covers.ts';
import { readCoverBytes } from '../lib/event-cover-http.ts';
import * as coverMapping from '../lib/supabase/event-cover-mapping.ts';

// Run the real adapter and SDK against an injected fetch; never contact Supabase.
function fixture(environment = {}, respond = () => new Response(new Uint8Array([1, 2, 3]))) {
  const requests = [];
  const source = ts.transpileModule(readFileSync(new URL('../lib/supabase/storage-admin.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dependencies = {
    'server-only': {},
    '@supabase/supabase-js': { createClient },
    '../event-cover-service': {},
    '../event-covers': { EventCoverError },
    '../event-cover-validation': { processCoverImage: () => assert.fail('No image processing expected') },
    '../event-cover-http': { readCoverBytes },
    './event-cover-mapping': coverMapping,
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, URL, AbortSignal,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://covers.test.invalid', ...environment } },
    require: name => { assert.ok(name in dependencies, `Unexpected import: ${name}`); return dependencies[name]; },
    fetch: async (url, init) => { requests.push({ url, ...init }); return respond(); },
  });
  return { ...exports, requests };
}

for (const [name, environment, expectedKey] of [
  ['secret', { SUPABASE_SECRET_KEY: 'sb_secret_fixture' }, 'sb_secret_fixture'],
  ['legacy', { SUPABASE_SERVICE_ROLE_KEY: 'legacy-fixture' }, 'legacy-fixture'],
  ['secret preferred', { SUPABASE_SECRET_KEY: 'sb_secret_fixture', SUPABASE_SERVICE_ROLE_KEY: 'legacy-fixture' }, 'sb_secret_fixture'],
]) {
  test(`${name}: bounded Storage download sends the configured key on the correct headers`, async () => {
    const setup = fixture(environment);
    const bytes = await setup.createEventCoverDependencies().download('event-covers', 'event/image.webp', 3);
    assert.deepEqual([...bytes], [1, 2, 3]);
    const [request] = setup.requests;
    const headers = new Headers(request.headers);
    assert.equal(headers.get('apikey'), expectedKey);
    assert.equal(headers.get('Authorization'), expectedKey.startsWith('sb_secret_') ? null : `Bearer ${expectedKey}`);
    assert.equal(request.cache, 'no-store');
    assert.equal(request.redirect, 'error');
    assert.equal(request.url, 'https://covers.test.invalid/storage/v1/object/authenticated/event-covers/event/image.webp');
  });
  test(`${name}: SDK queries and uploads use the same configured credential`, async () => {
    const setup = fixture(environment, () => Response.json({ Key: 'event-covers/image.webp', Id: 'fixture' }));
    const client = setup.createStorageAdminClient();
    await client.from('event_covers').select('image_id');
    await client.storage.from('event-covers').upload('image.webp', new Uint8Array([1]), { contentType: 'image/webp' });
    assert.equal(setup.requests.length, 2);
    for (const request of setup.requests) {
      assert.equal(new Headers(request.headers).get('apikey'), expectedKey);
      assert.equal(request.cache, 'no-store');
    }
  });
}

test('missing server key fails before any network request', () => {
  const setup = fixture();
  assert.throws(() => setup.createEventCoverDependencies(), error => error instanceof EventCoverError && error.status === 503);
  assert.equal(setup.requests.length, 0);
});

test('secret-key downloads retain their size limit', async () => {
  const setup = fixture({ SUPABASE_SECRET_KEY: 'sb_secret_fixture' });
  await assert.rejects(setup.createEventCoverDependencies().download('event-covers', 'image.webp', 2), error => error instanceof EventCoverError && error.status === 413);
});
