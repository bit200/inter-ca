const test = require('node:test')
const assert = require('node:assert')
const {ClientRegistry, ValidationError, isValidRedirectUri} = require('../lib/clients')
const {tmpFile} = require('./helpers')

function registry() {
    return new ClientRegistry({file: tmpFile('clients.json')})
}

const valid = {
    name: 'Портал развития',
    redirectUris: ['https://portal.itk.academy/auth/callback'],
    scopes: ['openid', 'profile'],
    grantTypes: ['authorization_code', 'refresh_token'],
}

test('создание клиента выдаёт client_id и секрет один раз', () => {
    let r = registry()
    let {client, secret} = r.create(valid)
    // имя кириллицей в slug не превращается - остаётся родовой префикс
    assert.match(client._id, /^client-[0-9a-f]{12}$/)
    let latin = r.create({...valid, name: 'CRM Jobs'}).client
    assert.match(latin._id, /^crm-jobs-[0-9a-f]{12}$/)
    assert.ok(secret && secret.length >= 32, 'секрет длинный')
    assert.equal(client.enabled, true)
    // из реестра секрет наружу больше не достать
    assert.equal(r.get(client._id).secret, undefined)
    assert.equal(r.get(client._id).secretHash, undefined)
})

test('секрет хранится хешем и проверяется по паре client_id/secret', () => {
    let r = registry()
    let {client, secret} = r.create(valid)
    assert.deepEqual(r.verifySecret(client._id, secret).ok, true)
    assert.deepEqual(r.verifySecret(client._id, secret + 'x').reason, 'bad_secret')
    assert.deepEqual(r.verifySecret('нет-такого', secret).reason, 'unknown_client')
})

test('выключенный клиент не проходит проверку секрета', () => {
    let r = registry()
    let {client, secret} = r.create(valid)
    r.setEnabled(client._id, false)
    assert.deepEqual(r.verifySecret(client._id, secret), {ok: false, reason: 'disabled'})
    r.setEnabled(client._id, true)
    assert.equal(r.verifySecret(client._id, secret).ok, true)
})

test('ротация секрета выдаёт новый и обесценивает старый', () => {
    let r = registry()
    let created = r.create(valid)
    let rotated = r.rotateSecret(created.client._id)
    assert.notEqual(rotated.secret, created.secret)
    assert.equal(r.verifySecret(created.client._id, created.secret).ok, false)
    assert.equal(r.verifySecret(created.client._id, rotated.secret).ok, true)
})

test('валидация: без названия, без grant type и без scope клиент не создаётся', () => {
    let r = registry()
    assert.throws(() => r.create({...valid, name: '  '}), ValidationError)
    assert.throws(() => r.create({...valid, grantTypes: []}), ValidationError)
    assert.throws(() => r.create({...valid, scopes: []}), ValidationError)
    assert.throws(() => r.create({...valid, grantTypes: ['password']}), ValidationError)
})

test('refresh_token без authorization_code не принимается', () => {
    let r = registry()
    assert.throws(() => r.create({...valid, grantTypes: ['refresh_token']}), ValidationError)
})

test('authorization_code требует redirect_uri, и только безопасный', () => {
    let r = registry()
    assert.throws(() => r.create({...valid, grantTypes: ['authorization_code'], redirectUris: []}), ValidationError)
    assert.throws(() => r.create({...valid, redirectUris: ['http://evil.example/cb']}), ValidationError)
    assert.throws(() => r.create({...valid, redirectUris: ['https://ok.example/cb#frag']}), ValidationError)
    assert.equal(isValidRedirectUri('http://localhost:3000/cb'), true)
    assert.equal(isValidRedirectUri('https://portal.itk.academy/cb'), true)
    assert.equal(isValidRedirectUri('не адрес'), false)
})

test('client_credentials живёт без redirect_uri', () => {
    let r = registry()
    let {client} = r.create({name: 'CRM jobs', scopes: ['openid'], grantTypes: ['client_credentials'], redirectUris: []})
    assert.deepEqual(client.redirectUris, [])
})

test('редактирование меняет поля, но не client_id', () => {
    let r = registry()
    let {client} = r.create(valid)
    let upd = r.update(client._id, {_id: 'подмена', name: 'Портал', scopes: 'openid email'})
    assert.equal(upd._id, client._id)
    assert.equal(upd.name, 'Портал')
    assert.deepEqual(upd.scopes, ['openid', 'email'])
})

test('список фильтруется по вкл/выкл и по строке поиска', () => {
    let r = registry()
    let a = r.create({...valid, name: 'Альфа'}).client
    r.create({...valid, name: 'Бета'})
    r.setEnabled(a._id, false)
    assert.deepEqual(r.list({enabled: 'true'}).map(c => c.name), ['Бета'])
    assert.deepEqual(r.list({enabled: 'false'}).map(c => c.name), ['Альфа'])
    assert.deepEqual(r.list({q: 'бет'}).map(c => c.name), ['Бета'])
    assert.equal(r.list().length, 2)
})

test('удаление убирает клиента из реестра', () => {
    let r = registry()
    let {client} = r.create(valid)
    r.remove(client._id)
    assert.equal(r.list().length, 0)
    assert.throws(() => r.get(client._id), /не найден/)
})

test('checkGrant пускает только разрешённый способ и заявленный redirect_uri', () => {
    let r = registry()
    let {client} = r.create(valid)
    assert.equal(r.checkGrant(client._id, 'authorization_code', valid.redirectUris[0]).ok, true)
    assert.equal(r.checkGrant(client._id, 'authorization_code', 'https://other/cb').reason, 'redirect_uri_mismatch')
    assert.equal(r.checkGrant(client._id, 'client_credentials').reason, 'grant_not_allowed')
    r.setEnabled(client._id, false)
    assert.equal(r.checkGrant(client._id, 'authorization_code', valid.redirectUris[0]).reason, 'disabled')
})

test('реестр переживает перезапуск процесса', () => {
    let file = tmpFile('clients.json')
    let {client} = new ClientRegistry({file}).create(valid)
    let again = new ClientRegistry({file})
    assert.equal(again.get(client._id).name, 'Портал развития')
})

test('тип подключения задаёт grant types: server-to-server, вход пользователей или оба', () => {
    let r = registry()
    let service = r.create({name: 'Mesh', kind: 'service', scopes: ['mesh:read']}).client
    assert.deepEqual(service.grantTypes, ['client_credentials'])
    assert.equal(service.kind, 'service')
    let login = r.create({...valid, grantTypes: undefined, kind: 'login'}).client
    assert.deepEqual(login.grantTypes, ['authorization_code', 'refresh_token'])
    assert.equal(r.update(login._id, {kind: 'both'}).kind, 'both')
    assert.throws(() => r.create({...valid, grantTypes: undefined, kind: 'телепорт'}), ValidationError)
})

test('post_logout_redirect_uri проверяется, как адрес возврата; владелец и first-party сохраняются', () => {
    let r = registry()
    let {client} = r.create({
        ...valid,
        postLogoutRedirectUris: ['https://portal.itk.academy/bye'],
        owner: 'Команда портала',
        contact: 'portal@itk.academy',
        firstParty: true,
    })
    assert.deepEqual(client.postLogoutRedirectUris, ['https://portal.itk.academy/bye'])
    assert.equal(client.firstParty, true)
    assert.equal(client.contact, 'portal@itk.academy')
    assert.throws(() => r.update(client._id, {postLogoutRedirectUris: ['http://evil.example/bye']}), /после выхода/)
    assert.throws(() => r.create({name: 'Mesh', kind: 'service', scopes: ['mesh:read'], postLogoutRedirectUris: ['https://x.example/']}),
        /только системе со входом/)
})

test('выключение и удаление клиента объявляют отзыв его токенов, повторное выключение — нет', () => {
    let r = registry()
    let events = []
    r.on('revoke', e => events.push(e))
    let {client} = r.create(valid)
    r.update(client._id, {name: 'Портал'})
    assert.equal(events.length, 0, 'правка без выключения токены не трогает')
    r.setEnabled(client._id, false)
    r.setEnabled(client._id, false)
    assert.deepEqual(events.map(e => e.reason), ['disabled'])
    r.remove(client._id)
    assert.deepEqual(events.map(e => [e.clientId, e.reason]), [[client._id, 'disabled'], [client._id, 'removed']])
})

test('разрешённые ресурсы: только из каталога и только со scope этого ресурса', () => {
    let r = registry()
    let {client} = r.create({
        ...valid,
        grantTypes: ['client_credentials'],
        redirectUris: [],
        resources: {evaluate: ['evaluate:run', 'evaluate:docs'], 'external-api': 'mock:read score:read'},
    })
    assert.deepEqual(r.get(client._id).resources, [
        {resource: 'evaluate', scopes: ['evaluate:run', 'evaluate:docs']},
        {resource: 'external-api', scopes: ['mock:read', 'score:read']},
    ])

    let err = t => assert.throws(t, e => e instanceof ValidationError && e.errors.some(x => x.field === 'resources'))
    err(() => r.update(client._id, {resources: [{resource: 'billing', scopes: ['pay']}]}))
    err(() => r.update(client._id, {resources: [{resource: 'mesh', scopes: ['evaluate:run']}]}))
    err(() => r.update(client._id, {resources: [{resource: 'mesh', scopes: []}]}))

    assert.deepEqual(r.update(client._id, {resources: []}).resources, [], 'все ресурсы можно снять')
})
