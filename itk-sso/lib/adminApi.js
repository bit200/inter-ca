const fs = require('fs')
const path = require('path')
const {ClientRegistry, GRANT_TYPES, KNOWN_SCOPES, KINDS} = require('./clients')
const {TokenLog, EVENTS} = require('./tokenLog')
const {createAuth} = require('./adminAuth')

// HTTP-слой админки реестра. Намеренно без express: itk-sso ещё не собран
// (каркас - задача #1945), а реестру нужно ровно семь ручек, которые умеет
// отдать штатный http. Когда каркас появится, createRouter можно подмонтировать
// в него как обычный (req, res, next).

const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
}

function send(res, status, body) {
    let json = JSON.stringify(body)
    res.writeHead(status, {'content-type': 'application/json; charset=utf-8'})
    res.end(json)
}

// Страница живёт не в корне (по умолчанию /admin), а ссылки на admin.css,
// admin.js и ручки в ней относительные - адрес монтирования подставляем в <base>
// при отдаче. Иначе браузер ищет /admin.css в корне и получает голый HTML.
function servePage(res, file, base, status) {
    let full = path.join(PUBLIC_DIR, file)
    if (!full.startsWith(PUBLIC_DIR) || !fs.existsSync(full) || !fs.statSync(full).isFile()) return false
    let body = fs.readFileSync(full)
    let type = MIME[path.extname(full)] || 'application/octet-stream'
    if (path.extname(full) === '.html') {
        body = body.toString('utf-8').replace('__BASE__', (base || '') + '/')
    }
    res.writeHead(status || 200, {'content-type': type})
    res.end(body)
    return true
}

function sendPage(res, file, base, status) {
    if (!servePage(res, file, base, status)) send(res, 404, {error: 'Страница не найдена: ' + file})
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let chunks = []
        req.on('data', c => chunks.push(c))
        req.on('error', reject)
        req.on('end', () => {
            let raw = Buffer.concat(chunks).toString('utf-8')
            if (!raw) return resolve({})
            try {
                resolve(JSON.parse(raw))
            } catch (e) {
                reject(Object.assign(new Error('Тело запроса — не JSON'), {status: 400}))
            }
        })
    })
}

function createRouter(opts) {
    opts = opts || {}
    let registry = opts.registry || new ClientRegistry(opts)
    let log = opts.log || new TokenLog(opts)
    // Админка закрыта паролем (см. lib/adminAuth.js). auth: false - осознанно
    // открытый роутер: так его поднимают тесты, в рабочем запуске так не делают.
    // Справочник для формы «новая система»: ресурсы (aud) и их scope'ы - из конфига сервиса.
    let knownResources = opts.knownResources || []
    let resourceScopes = opts.resourceScopes || []
    let auth = opts.auth === false ? null : createAuth(opts.auth || {password: process.env.SSO_ADMIN_PASSWORD})

    async function route(req, res) {
        let url = new URL(req.url, 'http://itk-sso')
        let p = url.pathname.replace(/\/+$/, '') || '/'
        let q = Object.fromEntries(url.searchParams)
        let base = req.baseUrl || ''
        let m

        if (auth && p === '/login' && req.method === 'POST') {
            let body = await readBody(req)
            if (!auth.matches(body.password)) return send(res, 401, {error: 'Пароль не подошёл'})
            auth.issue(req, res, base)
            return send(res, 200, {ok: true})
        }

        if (auth && p === '/logout' && req.method === 'POST') {
            auth.clear(req, res, base)
            return send(res, 200, {ok: true})
        }

        if (auth && !auth.ok(req)) {
            // Человеку - экран входа, машине - честный 401: админка не публична.
            // Стили пускаем до входа: ими же нарисован экран входа.
            if (req.method === 'GET' && p === '/admin.css') {
                if (servePage(res, 'admin.css', base)) return
            }
            if (req.method === 'GET' && !p.startsWith('/api/') && !path.extname(p)) {
                return sendPage(res, 'login.html', base, 401)
            }
            return send(res, 401, {error: 'Нужен вход в админку'})
        }

        if (p === '/api/meta' && req.method === 'GET') {
            return send(res, 200, {
                grantTypes: GRANT_TYPES,
                kinds: KINDS,
                knownScopes: [...KNOWN_SCOPES, ...resourceScopes.filter(s => KNOWN_SCOPES.indexOf(s) === -1)],
                resourceScopes,
                knownResources,
                events: EVENTS,
            })
        }

        if (p === '/api/clients') {
            if (req.method === 'GET') {
                let clients = registry.list(q).map(c => ({...c, tokenStats: log.statsFor(c._id)}))
                return send(res, 200, {items: clients})
            }
            if (req.method === 'POST') {
                let {client, secret} = registry.create(await readBody(req))
                return send(res, 201, {item: client, secret})
            }
        }

        if ((m = p.match(/^\/api\/clients\/([^/]+)$/))) {
            let id = decodeURIComponent(m[1])
            if (req.method === 'GET') {
                return send(res, 200, {item: registry.get(id), tokenStats: log.statsFor(id)})
            }
            if (req.method === 'PUT' || req.method === 'PATCH') {
                return send(res, 200, {item: registry.update(id, await readBody(req))})
            }
            if (req.method === 'DELETE') {
                return send(res, 200, {item: registry.remove(id)})
            }
        }

        if ((m = p.match(/^\/api\/clients\/([^/]+)\/secret$/)) && req.method === 'POST') {
            let {client, secret} = registry.rotateSecret(decodeURIComponent(m[1]))
            return send(res, 200, {item: client, secret})
        }

        if (p === '/api/token-log') {
            if (req.method === 'GET') return send(res, 200, {items: log.list(q)})
            if (req.method === 'POST') return send(res, 201, {item: log.record(await readBody(req))})
        }

        if (req.method === 'GET') {
            let file = p === '/' ? 'index.html' : p.slice(1)
            if (servePage(res, file, base)) return
        }

        return send(res, 404, {error: 'Такой ручки нет: ' + req.method + ' ' + p})
    }

    return function handler(req, res, next) {
        route(req, res).catch(err => {
            if (err && err.status === 404 && typeof next === 'function') return next()
            let status = (err && err.status) || 500
            if (status === 500) console.error('itk-sso admin', err)
            send(res, status, {error: err.message || 'Внутренняя ошибка', errors: (err && err.errors) || []})
        })
    }
}

module.exports = {createRouter, readBody}
