const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function fixture(caller = 'member-a') {
  return {caller, sends: [], env: {}, tables: {
    UserList: [{_id: 'ua', _openid: 'member-a', credit: 10}, {_id: 'ub', _openid: 'member-b', credit: 0}],
    MissionList: [{_id: 'ma', _openid: 'member-a', credit: 3, available: true}, {_id: 'mb', _openid: 'member-b', credit: 3, available: true}],
    MarketList: [{_id: 'sale', _openid: 'member-b', credit: 5, available: true}],
    StorageList: [{_id: 'sa', _openid: 'member-a'}, {_id: 'sb', _openid: 'member-b'}],
    match_codes: []
  }};
}

function database(state) {
  function query(name, conditions = {}, limit = Infinity) {
    const rows = () => (state.tables[name] || []).filter(row => Object.entries(conditions).every(([key, value]) => {
      if (value && value.op === 'gte') return row[key] >= value.value;
      if (value && value.op === 'neq') return row[key] !== value.value;
      return row[key] === value;
    })).slice(0, limit);
    return {
      where(next) { return query(name, {...conditions, ...next}, limit); },
      limit(next) { return query(name, conditions, next); },
      orderBy() { return this; },
      async get() { return {data: rows().map(row => ({...row}))}; },
      async add({data}) {
        state.tables[name] = state.tables[name] || [];
        const item = {...data, _id: 'new-' + state.tables[name].length};
        state.tables[name].push(item);
        return {_id: item._id};
      },
      async remove() {
        const selected = rows();
        state.tables[name] = state.tables[name].filter(row => !selected.includes(row));
        return {stats: {removed: selected.length}};
      },
      async update({data}) {
        const selected = rows();
        for (const row of selected) for (const [key, value] of Object.entries(data)) {
          row[key] = value && value.op === 'inc' ? row[key] + value.value : value;
        }
        return {stats: {updated: selected.length}};
      }
    };
  }
  return {collection: name => query(name), serverDate: () => 'server-time', command: {
    inc: value => ({op: 'inc', value}), gte: value => ({op: 'gte', value}), neq: value => ({op: 'neq', value})
  }};
}

function cloudFunction(name, state) {
  const db = database(state);
  const cloud = {
    DYNAMIC_CURRENT_ENV: 'test-only', init() {}, database: () => db,
    getWXContext: () => ({OPENID: state.caller}),
    openapi: {subscribeMessage: {async send(message) { state.sends.push(message); return {}; }}}
  };
  const context = {exports: {}, process: {env: state.env}, console, Date,
    require(module) {
      if (module === 'wx-server-sdk') return cloud;
      if (module === './auth') return require(path.join(root, 'cloudfunctions', name, 'auth.js'));
      if (module === 'crypto') return {randomInt: () => 1234};
      throw new Error('Unexpected dependency: ' + module);
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'cloudfunctions', name, 'index.js'), 'utf8'), context);
  return context.exports.main;
}

function page(relative, callFunction) {
  let instance;
  const app = {globalData: {}, cloud: () => ({callFunction})};
  const state = {toasts: [], switches: [], app};
  vm.runInNewContext(fs.readFileSync(path.join(root, relative), 'utf8'), {
    Page(value) { instance = value; }, getApp: () => app,
    wx: {showToast(value) { state.toasts.push(value); }, async switchTab(value) { state.switches.push(value); }}
  });
  instance.setData = values => Object.assign(instance.data, values);
  return {instance, state};
}

test('login returns trusted caller identity for a registered member', async () => {
  const result = await cloudFunction('login', fixture())({openid: 'forged'});
  assert.equal(result.openid, 'member-a');
});
test('missing caller identity fails closed', async () => {
  await assert.rejects(cloudFunction('login', fixture(''))({}), /UNAUTHENTICATED/);
});
for (const name of ['login', 'getList', 'getElementById', 'getElementByOpenId', 'addElement', 'deleteElement', 'editStar', 'editAvailable', 'editCredit', 'generateCode', 'information']) {
  test(name + ' rejects a caller absent from UserList', async () => {
    await assert.rejects(cloudFunction(name, fixture('outsider'))({}), /FORBIDDEN/);
  });
}
test('getOpenId returns only the caller identity for initial registration', async () => {
  assert.equal(await cloudFunction('getOpenId', fixture('new-user'))({}), 'new-user');
});
test('arbitrary collection names are rejected', async () => {
  await assert.rejects(cloudFunction('getList', fixture())({list: 'PrivateSecrets'}), /INVALID_COLLECTION/);
});
test('storage list is filtered to the current caller', async () => {
  const result = await cloudFunction('getList', fixture())({list: 'StorageList'});
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0]._openid, 'member-a');
});
test('partner storage cannot be read by record id', async () => {
  await assert.rejects(cloudFunction('getElementById', fixture())({list: 'StorageList', _id: 'sb'}), /FORBIDDEN_OWNER/);
});
test('partner storage cannot be read by forged owner input', async () => {
  await assert.rejects(cloudFunction('getElementByOpenId', fixture())({list: 'StorageList', _openid: 'member-b'}), /FORBIDDEN_OWNER/);
});
test('new record ownership comes from the server, not the event', async () => {
  const state = fixture();
  await cloudFunction('addElement', state)({list: 'MissionList', _openid: 'forged', title: 'task', desc: '', credit: 5});
  assert.equal(state.tables.MissionList.at(-1)._openid, 'member-a');
});
test('normal users cannot add records to the membership collection', async () => {
  await assert.rejects(cloudFunction('addElement', fixture())({list: 'UserList', title: 'x', credit: 0}), /INVALID_COLLECTION/);
});
test('fractional or excessive credit is rejected', async () => {
  for (const credit of [1.5, 501, -1, 'not-a-number']) {
    await assert.rejects(cloudFunction('addElement', fixture())({list: 'MissionList', title: 'x', credit}), /INVALID_CREDIT/);
  }
});
test('own record deletion is awaited and returned', async () => {
  const state = fixture();
  const result = await cloudFunction('deleteElement', state)({list: 'MissionList', _id: 'ma'});
  assert.equal(result.stats.removed, 1);
  assert.equal(state.tables.MissionList.length, 1);
});
test('partner record deletion is rejected', async () => {
  await assert.rejects(cloudFunction('deleteElement', fixture())({list: 'MissionList', _id: 'mb'}), /FORBIDDEN_OWNER/);
});
test('partner record star update is rejected', async () => {
  await assert.rejects(cloudFunction('editStar', fixture())({list: 'MissionList', _id: 'mb', value: true}), /FORBIDDEN_OWNER/);
});
test('own mission cannot be confirmed by its creator', async () => {
  await assert.rejects(cloudFunction('editAvailable', fixture())({list: 'MissionList', _id: 'ma', value: false}), /CANNOT_CONFIRM/);
});
test('a member can confirm the partner mission', async () => {
  const result = await cloudFunction('editAvailable', fixture())({list: 'MissionList', _id: 'mb', value: false});
  assert.equal(result.stats.updated, 1);
});
test('a member cannot award positive credit to self', async () => {
  await assert.rejects(cloudFunction('editCredit', fixture())({list: 'UserList', _openid: 'member-a', value: 5}), /FORBIDDEN_CREDIT_DIRECTION/);
});
test('a member cannot debit the partner account', async () => {
  await assert.rejects(cloudFunction('editCredit', fixture())({list: 'UserList', _openid: 'member-b', value: -5}), /FORBIDDEN_CREDIT_DIRECTION/);
});
test('debit is conditional on sufficient credit', async () => {
  await assert.rejects(cloudFunction('editCredit', fixture())({list: 'UserList', _openid: 'member-a', value: -11}), /CREDIT_UPDATE_FAILED/);
});
test('a valid self debit updates the balance', async () => {
  const state = fixture();
  await cloudFunction('editCredit', state)({list: 'UserList', _openid: 'member-a', value: -5});
  assert.equal(state.tables.UserList[0].credit, 5);
});
test('partner credit can be increased within the configured bound', async () => {
  const state = fixture();
  await cloudFunction('editCredit', state)({list: 'UserList', _openid: 'member-b', value: 3});
  assert.equal(state.tables.UserList[1].credit, 3);
});
test('matching code uses database() and saves the trusted caller', async () => {
  const state = fixture();
  const result = await cloudFunction('generateCode', state)({});
  assert.equal(result.success, true);
  assert.match(result.code, /^\d{4}$/);
  assert.equal(state.tables.match_codes[0].users[0], 'member-a');
  assert.ok(state.tables.match_codes[0].expiresAt instanceof Date);
});
test('matching code collision retries are bounded', async () => {
  const state = fixture();
  state.tables.match_codes.push({code: '1234'});
  const result = await cloudFunction('generateCode', state)({});
  assert.equal(result.success, false);
});
test('notifications are skipped without server template configuration', async () => {
  const state = fixture();
  const result = await cloudFunction('information', state)({templateId: 'untrusted'});
  assert.equal(result.skipped, true);
  assert.equal(state.sends.length, 0);
});
test('notification recipient and template are server selected', async () => {
  const state = fixture();
  state.env.SUBSCRIBE_TEMPLATE_ID = 'test-only-template';
  const result = await cloudFunction('information', state)({touser: 'forged', templateId: 'forged'});
  assert.equal(result.success, true);
  assert.equal(state.sends[0].touser, 'member-b');
  assert.equal(state.sends[0].templateId, 'test-only-template');
});
test('login page no longer uses a shared password', async () => {
  const source = fs.readFileSync(path.join(root, 'miniprogram/pages/login/login.js'), 'utf8');
  assert.doesNotMatch(source, /correctPassword|data\.password/);
  const {instance, state} = page('miniprogram/pages/login/login.js', async request => {
    assert.equal(request.name, 'login'); return {result: {openid: 'member-a'}};
  });
  await instance.handleLogin();
  assert.equal(state.switches.length, 1);
  assert.equal(state.app.globalData.currentOpenid, 'member-a');
  assert.equal(instance.data.loading, false);
});
test('failed cloud login does not navigate and clears loading', async () => {
  const {instance, state} = page('miniprogram/pages/login/login.js', async () => { throw new Error('FORBIDDEN'); });
  await instance.handleLogin();
  assert.equal(state.switches.length, 0);
  assert.equal(state.toasts.length, 1);
  assert.equal(instance.data.loading, false);
});
test('matching code page reads response.result instead of resule', async () => {
  const {instance} = page('miniprogram/pages/generate.js', async () => ({result: {success: true, code: '1234'}}));
  await instance.generateCode();
  assert.equal(instance.data.code, '1234');
  assert.equal(instance.data.generating, false);
});
test('matching code failure clears loading and shows a message', async () => {
  const {instance, state} = page('miniprogram/pages/generate.js', async () => ({result: {success: false}}));
  await instance.generateCode();
  assert.equal(state.toasts.length, 1);
  assert.equal(instance.data.generating, false);
});
test('registered page entrypoints exist, including matching code page', () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'miniprogram/app.json')));
  assert.ok(app.pages.includes('pages/generate'));
  for (const route of app.pages) for (const extension of ['.js', '.wxml']) {
    assert.ok(fs.existsSync(path.join(root, 'miniprogram', route + extension)), route + extension);
  }
});

test('app initializes the configured cloud environment only once', () => {
  let app;
  const calls = [];
  const cloud = {init: options => calls.push(options)};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'miniprogram/app.js'), 'utf8'), {
    require: () => ({cloudEnvId: 'test-only-env', userA: 'A', userB: 'B'}),
    App: value => { app = value; }, wx: {cloud}, console: {warn() {}}
  });
  app.onLaunch();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].env, 'test-only-env');
  assert.equal(app.cloud(), cloud);
});

test('missing cloud configuration fails closed without initialization', () => {
  let app;
  let calls = 0;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'miniprogram/app.js'), 'utf8'), {
    require: () => ({cloudEnvId: ''}), App: value => { app = value; },
    wx: {cloud: {init() { calls++; }}}, console: {warn() {}}
  });
  app.onLaunch();
  assert.equal(calls, 0);
  assert.throws(() => app.cloud(), /请先配置云环境/);
});
