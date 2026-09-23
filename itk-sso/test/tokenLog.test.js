const test = require('node:test')
const assert = require('node:assert')
const {TokenLog} = require('../lib/tokenLog')
const {tmpFile} = require('./helpers')

function log(opts) {
    return new TokenLog({file: tmpFile('token-log.json'), ...(opts || {})})
}

test('выдача и отзыв пишутся в журнал отдельными событиями', () => {
    let l = log()
    l.issued({clientId: 'portal', tokenType: 'access', subject: 'u42', scopes: ['openid'], jti: 'a1'})
    l.revoked({clientId: 'portal', tokenType: 'refresh', subject: 'u42', jti: 'a1', reason: 'logout'})
    let items = l.list()
    assert.equal(items.length, 2)
    assert.equal(items[0].event, 'revoked', 'новое событие сверху')
    assert.equal(items[0].reason, 'logout')
    assert.equal(items[1].event, 'issued')
})

test('сам токен в журнал не попадает — только его jti', () => {
    let l = log()
    let row = l.issued({clientId: 'portal', jti: 'a1', token: 'секретный.jwt.токен'})
    assert.equal(row.token, undefined)
    assert.equal(row.jti, 'a1')
    assert.equal(JSON.stringify(l.list()).indexOf('секретный'), -1)
})

test('журнал фильтруется по клиенту, событию и пользователю', () => {
    let l = log()
    l.issued({clientId: 'portal', subject: 'u1'})
    l.issued({clientId: 'crm', subject: 'u2'})
    l.revoked({clientId: 'portal', subject: 'u1'})
    assert.equal(l.list({clientId: 'portal'}).length, 2)
    assert.equal(l.list({clientId: 'crm'}).length, 1)
    assert.equal(l.list({event: 'revoked'}).length, 1)
    assert.equal(l.list({subject: 'u2'}).length, 1)
})

test('limit обрезает выдачу, по умолчанию сотня', () => {
    let l = log()
    for (let i = 0; i < 120; i++) l.issued({clientId: 'portal', jti: 'j' + i})
    assert.equal(l.list().length, 100)
    assert.equal(l.list({limit: 5}).length, 5)
    assert.equal(l.list({limit: 5})[0].jti, 'j119')
})

test('журнал не растёт бесконечно — хвост старых событий отрезается', () => {
    let l = log({maxEvents: 10})
    for (let i = 0; i < 25; i++) l.issued({clientId: 'portal', jti: 'j' + i})
    let items = l.list({limit: 1000})
    assert.equal(items.length, 10)
    assert.equal(items[items.length - 1].jti, 'j15')
})

test('неизвестное событие не пишется', () => {
    let l = log()
    assert.throws(() => l.record({event: 'выдал-наверное', clientId: 'portal'}), /Неизвестное событие/)
})

test('сводка по клиенту считает выдачи, отзывы и последнюю активность', () => {
    let times = ['2026-09-01T10:00:00.000Z', '2026-09-02T10:00:00.000Z', '2026-09-03T10:00:00.000Z']
    let i = 0
    let l = log({now: () => times[i++]})
    l.issued({clientId: 'portal'})
    l.issued({clientId: 'portal'})
    l.revoked({clientId: 'portal'})
    assert.deepEqual(l.statsFor('portal'), {issued: 2, revoked: 1, denied: 0, lastAt: times[2]})
    assert.deepEqual(l.statsFor('crm'), {issued: 0, revoked: 0, denied: 0, lastAt: ''})
})

test('журнал переживает перезапуск процесса', () => {
    let file = tmpFile('token-log.json')
    new TokenLog({file}).issued({clientId: 'portal', jti: 'a1'})
    assert.equal(new TokenLog({file}).list()[0].jti, 'a1')
})
