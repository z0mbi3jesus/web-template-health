const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const serveFrontend = require('./serve-frontend');
const root = path.resolve(__dirname, '..');
const quiet = { log() {}, error() {}, warn() {} };
function evaluate(file, dependencies, extra = {}) {
  const localModule = { exports: {} };
  const sandbox = { module: localModule, exports: localModule.exports, process: { env: {} }, console: quiet,
    require(name) { if (name === 'dotenv') return { config() {} }; return name in dependencies ? dependencies[name] : require(name); }, ...extra };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
  return localModule.exports;
}
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } }; }
function chain(value) { const builder = {}; for (const name of ['select','eq','update','insert','order','limit','in']) builder[name] = () => builder;
  builder.single = async () => value; return builder; }
function rootAPI(options = {}) {
  const profile = { id: 'client-1', name: 'Patient', email: 'patient@example.invalid', role: 'client', is_active: true };
  const calls = []; let authClients = 0;
  const admin = { from: () => chain({ data: profile, error: null }), rpc: async (name, params) => { calls.push({ name, params }); return { data: { id: 'appointment-1' }, error: null }; }, auth: { admin: { signOut: async (...args) => { calls.push({ name: 'signOut', args }); return { error: null }; } } } };
  const config = { supabase: { auth: { getUser: async () => ({ data: { user: { id: profile.id } }, error: null }) } }, supabaseAdmin: admin,
    createAuthClient: () => { authClients++; return { auth: { signInWithPassword: async () => ({ data: { user: { id: profile.id }, session: { access_token: 'token-' + authClients } }, error: null }) } }; },
    TABLES: { USERS: 'users', APPOINTMENTS: 'appointments' }, USER_ROLES: { CLIENT: 'client', STAFF: 'staff', ADMIN: 'admin' }, APPOINTMENT_STATUS: { PENDING: 'pending', CONFIRMED: 'confirmed', CANCELLED: 'cancelled', COMPLETED: 'completed', NO_SHOW: 'no_show' } };
  const app = evaluate('server-supabase.js', { './config/supabase': config });
  const handlers = (route, method) => app.router.stack.find(layer => layer.route?.path === route && layer.route.methods[method]).route.stack.map(layer => layer.handle);
  return { profile, calls, handlers, authClientCount: () => authClients };
}
function backendAuth(profileResult, userResult = { data: { user: { id: 'user-1', user_metadata: { role: 'admin' } } }, error: null }) {
  const supabase = { auth: { getUser: async () => userResult }, from: () => chain(profileResult) };
  return evaluate('backend/middleware/auth.js', { '@supabase/supabase-js': { createClient: () => supabase }, '../config/database': { query: async () => ({ rows: [] }) }, jsonwebtoken: { verify: () => ({ id: 'user-1', role: 'admin' }) } });
}

test('public pages remain available while backend, scripts, SQL and secrets are blocked', async () => {
  const app = express(); serveFrontend(app, root);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    for (const file of ['/', '/admin-panel.html', '/js/html-escape.js', '/styles.css']) assert.equal((await fetch(base + file)).status, 200, file);
    for (const file of ['/server-supabase.js', '/config/supabase.js', '/backend/server.js', '/package.json', '/database/schema.sql', '/.env', '/scripts/release.js', '/js/../config/supabase.js']) assert.equal((await fetch(base + file)).status, 404, file);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('backend auth rejects missing profiles even when user metadata claims admin', async () => {
  const auth = backendAuth({ data: null, error: { message: 'missing' } }); const res = response(); let next = false;
  await auth.protect({ headers: { authorization: 'Bearer token' }, cookies: {} }, res, () => { next = true; });
  assert.equal(res.code, 401); assert.equal(next, false);
});
test('local JWT fallback rechecks active authoritative profile', async () => {
  const auth = backendAuth({ data: { id: 'user-1', role: 'client', is_active: false }, error: null }, { data: { user: null }, error: {} }); const res = response();
  await auth.protect({ headers: { authorization: 'Bearer token' }, cookies: {} }, res, () => assert.fail('inactive user accepted'));
  assert.equal(res.code, 401);
});
test('video route module initializes with real auth factory and database export', () => {
  const auth = backendAuth({ data: { id: 'user-1', role: 'client', is_active: true }, error: null });
  const router = evaluate('backend/routes/video-visits.js', { '../middleware/auth': auth, '../middleware/audit': { auditLog: () => (req,res,next) => next() }, '../config/database': { supabase: {} } });
  assert.ok(router.stack.length >= 4);
});
test('booking uses only transactional RPC and rejects absent slot IDs', async () => {
  const api = rootAPI(); const handler = api.handlers('/api/appointments', 'post').at(-1);
  const bad = response(); await handler({ body: { appointment_type_id: 'type-1', start_time: '2027-01-01T10:00:00Z' }, user: api.profile }, bad);
  assert.equal(bad.code, 400); assert.equal(api.calls.length, 0);
  const good = response(); await handler({ body: { slot_id: '11111111-1111-4111-8111-111111111111', appointment_type_id: 'type-1', start_time: '2027-01-01T10:00:00Z' }, user: api.profile }, good);
  assert.equal(good.code, 201); assert.equal(api.calls[0].name, 'create_booked_appointment'); assert.equal(api.calls[0].params.p_client_id, api.profile.id);
});
test('cancel handler delegates capacity changes to transition RPC', async () => {
  const api = rootAPI(); const res = response();
  await api.handlers('/api/appointments/:id/status', 'patch').at(-1)({ params: { id: 'appointment-1' }, body: { status: 'cancelled' }, user: { id: 'admin-1', role: 'admin' } }, res);
  assert.equal(res.code, 200); assert.equal(api.calls[0].name, 'transition_appointment'); assert.equal(api.calls.length, 1);
});
test('logins use separate auth clients and logout targets requesting token', async () => {
  const api = rootAPI(); const login = api.handlers('/api/auth/login', 'post').at(-1);
  const first=response(),second=response();
  await login({ body: { email: 'a@example.invalid', password: 'placeholder' } }, first);
  await login({ body: { email: 'b@example.invalid', password: 'placeholder' } }, second);
  assert.equal(api.authClientCount(), 2); assert.notEqual(first.body.token, second.body.token);
  await api.handlers('/api/auth/logout', 'post').at(-1)({ authToken: 'request-token' }, response());
  assert.equal(api.calls.at(-1).args[0], 'request-token'); assert.equal(api.calls.at(-1).args[1], 'local');
});
test('root authentication rejects inactive profiles', async () => {
  const api=rootAPI(); api.profile.is_active=false; const res=response();
  await api.handlers('/api/auth/me','get')[0]({ headers:{ authorization:'Bearer token' } },res,()=>assert.fail('inactive profile accepted'));
  assert.equal(res.code,401);
});
test('HTML helper escapes element and attribute delimiters', () => {
  const sandbox={window:{}}; vm.runInNewContext(fs.readFileSync(path.join(root,'js/html-escape.js'),'utf8'),sandbox);
  assert.equal(sandbox.window.escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(sandbox.window.escapeHtml("'&"), '&#39;&amp;');
});
