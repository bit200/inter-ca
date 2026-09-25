const test = require('node:test')
const assert = require('node:assert')
const http = require('node:http')
const {createRouter} = require('../lib/adminApi')
const {ClientRegistry} = require('../lib/clients')
const {TokenLog} = require('../lib/tokenLog')
const {tmpFile} = require('./helpers')

async function withServer(fn, opts) {
    let server = http.createServer(createRouter({
        ...(opts || {}),
        auth: false, // замок админки проверяет adminAuth.test.js, здесь мешает
        registry: new ClientRegistry({file: tmpFile('clients.json')}),
        log: new TokenLog({file: tmpFile('token-log.json')}),
    }))
    await new Promise(r => server.listen(0, r))
    let base = 'http://127.0.0.1:' + server.address().port
    let call = async (method, p, body) => {
        let res = await fetch(base + p, {
            method,
            headers: body ? {'content-type': 'application/json'} : {},
            body: body ? JSON.stringify(body) : undefined,
        })
        let text = await res.text()
        let json
        try {
            json = JSON.parse(text)
        } catch (e) {
            json = text
        }
        return {status: res.status, body: json, text, res}
    }
    try {
        await fn(call)
    } finally {
        await new Promise(r => server.close(r))
    }
}

const valid = {
    name: 'Портал развития',
    redirectUris: ['https://portal.itk.academy/auth/callback'],
    scopes: ['openid', 'profile'],
    grantTypes: ['authorization_code', 'refresh_token'],
}

test('CRUD клиента ходит по HTTP целиком', async () => {
    await withServer(async call => {
        let created = await call('POST', '/api/clients', valid)
        assert.equal(created.status, 201)
        let id = created.body.item._id
        assert.ok(created.body.secret, 'секрет отдан один раз при создании')

        let list = await call('GET', '/api/clients')
        assert.equal(list.body.items.length, 1)
        assert.equal(list.body.items[0].secret, undefined)
        assert.deepEqual(list.body.items[0].tokenStats, {issued: 0, revoked: 0, denied: 0, lastAt: ''})

        let one = await call('GET', '/api/clients/' + id)
        assert.equal(one.body.item.name, 'Портал развития')

        let upd = await call('PUT', '/api/clients/' + id, {name: 'Портал', enabled: false})
        assert.equal(upd.body.item.name, 'Портал')
        assert.equal(upd.body.item.enabled, false)

        let rotated = await call('POST', '/api/clients/' + id + '/secret')
        assert.ok(rotated.body.secret && rotated.body.secret !== created.body.secret)

        assert.equal((await call('DELETE', '/api/clients/' + id)).status, 200)
        assert.equal((await call('GET', '/api/clients')).body.items.length, 0)
    })
})

test('кривой клиент отклоняется с 422 и разбором по полям', async () => {
    await withServer(async call => {
        let res = await call('POST', '/api/clients', {...valid, redirectUris: ['http://evil.example/cb']})
        assert.equal(res.status, 422)
        assert.equal(res.body.errors[0].field, 'redirectUris')
        assert.match(res.body.error, /Адрес возврата не подходит/)
    })
})

test('несуществующий клиент — 404, а не 500', async () => {
    await withServer(async call => {
        let res = await call('GET', '/api/clients/нет-такого')
        assert.equal(res.status, 404)
        assert.match(res.body.error, /не найден/)
    })
})

test('журнал токенов пишется и читается через ручку', async () => {
    await withServer(async call => {
        let id = (await call('POST', '/api/clients', valid)).body.item._id
        await call('POST', '/api/token-log', {event: 'issued', clientId: id, subject: 'u42', tokenType: 'access', jti: 'a1'})
        await call('POST', '/api/token-log', {event: 'revoked', clientId: id, subject: 'u42', jti: 'a1', reason: 'logout'})
        let log = await call('GET', '/api/token-log?clientId=' + encodeURIComponent(id))
        assert.equal(log.body.items.length, 2)
        assert.equal(log.body.items[0].event, 'revoked')
        assert.equal((await call('GET', '/api/token-log?event=issued')).body.items.length, 1)

        let list = await call('GET', '/api/clients')
        assert.equal(list.body.items[0].tokenStats.issued, 1)
        assert.equal(list.body.items[0].tokenStats.revoked, 1)
    })
})

test('справочник значений отдаётся фронту одной ручкой', async () => {
    await withServer(async call => {
        let meta = await call('GET', '/api/meta')
        assert.deepEqual(meta.body.grantTypes, ['authorization_code', 'refresh_token', 'client_credentials'])
        assert.ok(meta.body.knownScopes.includes('openid'))
    })
})

test('форма «новая система» получает ресурсы и типы подключения из справочника и заводит систему одним POST', async () => {
    await withServer(async call => {
        let meta = await call('GET', '/api/meta')
        assert.deepEqual(meta.body.resources.map(r => r.key), ['evaluate', 'mesh', 'external-api'], 'каталог ресурсов для формы')
        assert.ok(meta.body.resources.every(r => r.audience && r.scopes.length), 'у каждого ресурса aud и scope\'ы')
        assert.deepEqual(meta.body.kinds.service, ['client_credentials'])
        assert.ok(meta.body.knownScopes.includes('profile:read'), 'scope ресурса по умолчанию можно выбрать в карточке')

        let created = await call('POST', '/api/clients', {
            name: 'Партнёрская HR-система',
            kind: 'both',
            redirectUris: ['https://hr.partner.example/callback'],
            postLogoutRedirectUris: ['https://hr.partner.example/bye'],
            resources: [{resource: 'external-api', scopes: ['mock:read', 'score:read']}],
            scopes: ['openid', 'profile'],
            owner: 'ООО Партнёр',
            contact: 'it@partner.example',
        })
        assert.equal(created.status, 201)
        assert.ok(created.body.secret, 'секрет показан один раз — в ответе на создание')
        let item = created.body.item
        assert.equal(item.kind, 'both')
        assert.deepEqual(item.grantTypes, ['authorization_code', 'refresh_token', 'client_credentials'])
        assert.equal(item.firstParty, false, 'новая система по умолчанию сторонняя — с экраном согласия')
        assert.equal(item.owner, 'ООО Партнёр')

        let again = await call('GET', '/api/clients/' + item._id)
        assert.equal(again.body.item.secretHash, undefined)
        assert.equal(again.body.item.secret, undefined)
        assert.deepEqual(again.body.item.postLogoutRedirectUris, ['https://hr.partner.example/bye'])
        assert.deepEqual(again.body.item.resources, [{resource: 'external-api', scopes: ['mock:read', 'score:read']}])
    }, {resourceScopes: ['profile:read']})
})

test('страница админки отдаётся с корня', async () => {
    await withServer(async call => {
        let page = await call('GET', '/')
        assert.equal(page.status, 200)
        assert.match(page.res.headers.get('content-type'), /text\/html/)
        assert.match(page.text, /Реестр OAuth-клиентов/)
    })
})

test('неизвестная ручка — 404 JSON, и за пределы public не выпускает', async () => {
    await withServer(async call => {
        assert.equal((await call('GET', '/api/нет')).status, 404)
        assert.equal((await call('GET', '/../lib/clients.js')).status, 404)
    })
})
