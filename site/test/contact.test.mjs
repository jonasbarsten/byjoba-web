import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../contact.js', import.meta.url), 'utf8');
const FAILED = 'Could not verify. Reload the page to try again.';

/** A Turnstile stand-in that keeps the options the page hands it. */
function turnstileStub() {
  const stub = { render(_widget, options) { stub.options = options; } };
  return stub;
}

/** Runs contact.js against a minimal fake page, fires `load`, and returns the two elements. */
function run({ turnstile, fetch }) {
  const widget = { hidden: false, dataset: { sitekey: 'KEY' } };
  const result = { hidden: true, shown: null, replaceChildren(node) { this.shown = node; } };
  const listeners = {};
  const context = {
    window: { addEventListener: (type, listener) => { listeners[type] = listener; } },
    document: {
      getElementById: (id) => (id === 'turnstile' ? widget : result),
      createTextNode: (text) => ({ text }),
      createElement: () => ({}),
    },
    fetch,
    encodeURIComponent,
  };
  if (turnstile) context.turnstile = turnstile;
  vm.runInNewContext(source, context);
  listeners.load();
  return { widget, result };
}

const assertFailed = ({ widget, result }) => {
  assert.deepEqual(result.shown, { text: FAILED });
  assert.equal(result.hidden, false);
  assert.equal(widget.hidden, true);
};

test('the widget is rendered with the page\'s site key', () => {
  const turnstile = turnstileStub();
  run({ turnstile });
  assert.equal(turnstile.options.sitekey, 'KEY');
});

test('a verified token shows the address as a mailto link', async () => {
  const turnstile = turnstileStub();
  let requested;
  const page = run({
    turnstile,
    fetch: async (url) => {
      requested = url;
      return { ok: true, json: async () => ({ email: 'someone@example.com' }) };
    },
  });
  await turnstile.options.callback('t k');
  assert.equal(requested, '/contact?token=t%20k');
  assert.deepEqual(page.result.shown, { href: 'mailto:someone@example.com', textContent: 'someone@example.com' });
  assert.equal(page.result.hidden, false);
  assert.equal(page.widget.hidden, true);
});

test('a refused token shows the failure message', async () => {
  const turnstile = turnstileStub();
  const page = run({ turnstile, fetch: async () => ({ ok: false, json: async () => ({}) }) });
  await turnstile.options.callback('token');
  assertFailed(page);
});

test('a network error shows the failure message', async () => {
  const turnstile = turnstileStub();
  const page = run({ turnstile, fetch: async () => { throw new Error('offline'); } });
  await turnstile.options.callback('token');
  assertFailed(page);
});

test('a response that is not JSON shows the failure message', async () => {
  const turnstile = turnstileStub();
  const page = run({ turnstile, fetch: async () => ({ ok: true, json: async () => { throw new SyntaxError('bad'); } }) });
  await turnstile.options.callback('token');
  assertFailed(page);
});

test('a response without an address shows the failure message', async () => {
  const turnstile = turnstileStub();
  const page = run({ turnstile, fetch: async () => ({ ok: true, json: async () => ({}) }) });
  await turnstile.options.callback('token');
  assertFailed(page);
});

test('a Turnstile error shows the failure message', () => {
  const turnstile = turnstileStub();
  const page = run({ turnstile });
  turnstile.options['error-callback']();
  assertFailed(page);
});

test('a blocked Turnstile script shows the failure message', () => {
  assertFailed(run({}));
});
