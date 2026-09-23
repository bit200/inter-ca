const test = require('node:test')
const assert = require('node:assert')
const http = require('node:http')
const {createRouter} = require('../lib/adminApi')
const {ClientRegistry} = require('../lib/clients')
const {TokenLog} = require('../lib/tokenLog')
const {tmpFile} = require('./helpers')

const PASSWORD = 'очень-секретно-42'

async function withServer(fn, opts) {
    let server = http.createServer(createRouter(Object.assign({
        auth: {password: PASSWORD},
        registry: new ClientRegistry({file: tmpFile('clients.json')}),
        log: new TokenLog({file: tmpFile('token-log.json')}),
    }, opts || {})))
    await new Promise(r => server.listen(0, r))
    let base = 'http://127.0.0.1:' + server.address().port
    let cookie = ''
    let call = async (method, p, body) => {
        let res = await fetch(base + p, {
            method,
            headers: Object.assign(body ? {'content-type': 'application/json'} : {}, cookie ? {cookie} : {}),
            body: body ? JSON.stringify(body) : undefined,
            redirect: 'manual',
        })
        let set = res.headers.getSetCookie ? res.headers.getSetCookie() : []
        for (let c of set) cookie = c.split(';')[0]
        let text = await res.text()
        return {status: res.status, text, res}
    }
    try {
        await fn(call, () => cookie, c => { cookie = c })
    } finally {
        await new Promise(r => server.close(r))
    }
}

test('без входа админка не отдаёт ни данных, ни страницы реестра', async () => {
    await withServer(async call => {
        let api = await call('GET', '/api/clients')
        assert.equal(api.status, 401)
        assert.match(api.text, /Нужен вход/)

        let page = await call('GET', '/')
        assert.equal(page.status, 401)
        assert.match(page.text, /Пароль/, 'вместо реестра — экран входа')
        assert.doesNotMatch(page.text, /Журнал токенов/)
    })
})

test('стили экрана входа отдаются до входа, скрипт админки — нет', async () => {
    await withServer(async call => {
        let css = await call('GET', '/admin.css')
        assert.equal(css.status, 200, 'иначе экран входа приезжает голым HTML')
        assert.equal((await call('GET', '/admin.js')).status, 401)
    })
})

test('вход по паролю открывает реестр, выход закрывает обратно', async () => {
    await withServer(async (call, getCookie, setCookie) => {
        let bad = await call('POST', '/login', {password: 'не тот'})
        assert.equal(bad.status, 401)
        assert.equal(getCookie(), '', 'кривой пароль куку не выдаёт')

        let ok = await call('POST', '/login', {password: PASSWORD})
        assert.equal(ok.status, 200)
        assert.match(getCookie(), /^itk_sso_admin=/)

        let list = await call('GET', '/api/clients')
        assert.equal(list.status, 200)

        let page = await call('GET', '/')
        assert.match(page.text, /Журнал токенов/)

        await call('POST', '/logout')
        setCookie('')
        assert.equal((await call('GET', '/api/clients')).status, 401)
    })
})

test('подделанная кука не пускает', async () => {
    await withServer(async (call, getCookie, setCookie) => {
        setCookie('itk_sso_admin=' + (Date.now() + 3600000) + '.' + 'f'.repeat(64))
        assert.equal((await call('GET', '/api/clients')).status, 401)

        setCookie('itk_sso_admin=1.' + 'f'.repeat(64))
        assert.equal((await call('GET', '/api/clients')).status, 401)
    })
})

test('кука протухает по сроку из неё же', async () => {
    await withServer(async (call, getCookie, setCookie) => {
        await call('POST', '/login', {password: PASSWORD})
        let live = getCookie()
        assert.equal((await call('GET', '/api/meta')).status, 200)

        // тот же секрет, но срок в прошлом: подпись сойдётся, а пускать нельзя
        setCookie(live.replace(/=(\d+)\./, (m, exp) => '=' + (Number(exp) - 24 * 3600 * 1000) + '.'))
        assert.equal((await call('GET', '/api/meta')).status, 401)
    })
})

test('createRouter без пароля не поднимается: открытой админки не бывает', () => {
    assert.throws(() => createRouter({auth: {}}), /пароль/i)
})

test('страницы админки знают свой адрес монтирования', async () => {
    await withServer(async call => {
        let login = await call('GET', '/')
        assert.match(login.text, /<base href="\/">/, 'плейсхолдер __BASE__ подставлен')
        assert.doesNotMatch(login.text, /__BASE__/)
        assert.doesNotMatch(login.text, /href="\/admin\.css"/, 'ссылки на статику относительные')
    })
})
