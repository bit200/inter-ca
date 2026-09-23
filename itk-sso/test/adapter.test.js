'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createMemoryStore } = require('../src/db/memory');
const { createAdapterClass } = require('../src/adapter');

function setup() {
    let now = 1_700_000_000_000;
    const clock = () => now;
    const store = createMemoryStore({ now: clock });
    const Adapter = createAdapterClass(store, { now: clock });
    return { store, Adapter, tick: (ms) => { now += ms; } };
}

test('адаптер: запись находится по id и исчезает по сроку жизни', async () => {
    const { Adapter, tick } = setup();
    const tokens = new Adapter('AccessToken');

    await tokens.upsert('tok-1', { accountId: 'u1', grantId: 'g1' }, 60);
    assert.deepEqual((await tokens.find('tok-1')).accountId, 'u1');

    tick(61_000);
    assert.equal(await tokens.find('tok-1'), undefined, 'протухший токен больше не отдаётся');
});

test('адаптер: сессия ищется по uid, device-код по userCode', async () => {
    const { Adapter } = setup();
    const sessions = new Adapter('Session');
    await sessions.upsert('sess-1', { uid: 'uid-42', accountId: 'u1' }, 3600);
    assert.equal((await sessions.findByUid('uid-42')).accountId, 'u1');
    assert.equal(await sessions.findByUid('нет такого'), undefined);

    const codes = new Adapter('DeviceCode');
    await codes.upsert('dc-1', { userCode: 'ABCD-1234' }, 600);
    assert.equal((await codes.findByUserCode('ABCD-1234')).userCode, 'ABCD-1234');
});

test('адаптер: consume помечает код использованным, не удаляя его', async () => {
    const { Adapter } = setup();
    const codes = new Adapter('AuthorizationCode');
    await codes.upsert('code-1', { grantId: 'g1' }, 60);
    await codes.consume('code-1');
    const found = await codes.find('code-1');
    assert.ok(found.consumed, 'повторный обмен кода должен видеть отметку consumed');
});

test('адаптер: revokeByGrantId сносит все токены гранта, чужие не трогает', async () => {
    const { Adapter } = setup();
    const tokens = new Adapter('RefreshToken');
    await tokens.upsert('r1', { grantId: 'g1' }, 3600);
    await tokens.upsert('r2', { grantId: 'g1' }, 3600);
    await tokens.upsert('r3', { grantId: 'g2' }, 3600);

    await tokens.revokeByGrantId('g1');

    assert.equal(await tokens.find('r1'), undefined);
    assert.equal(await tokens.find('r2'), undefined);
    assert.ok(await tokens.find('r3'), 'токены другого гранта остаются');
});

test('адаптер: модели не пересекаются между собой', async () => {
    const { Adapter } = setup();
    await new Adapter('AccessToken').upsert('x', { kind: 'access' }, 60);
    await new Adapter('RefreshToken').upsert('x', { kind: 'refresh' }, 60);
    assert.equal((await new Adapter('AccessToken').find('x')).kind, 'access');
    assert.equal((await new Adapter('RefreshToken').find('x')).kind, 'refresh');
});

test('адаптер: destroy убирает запись', async () => {
    const { Adapter } = setup();
    const grants = new Adapter('Grant');
    await grants.upsert('g1', { accountId: 'u1' }, 60);
    await grants.destroy('g1');
    assert.equal(await grants.find('g1'), undefined);
});
