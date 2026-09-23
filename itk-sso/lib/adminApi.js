const fs = require('fs')
const path = require('path')
const {ClientRegistry, GRANT_TYPES, KNOWN_SCOPES} = require('./clients')
const {TokenLog, EVENTS} = require('./tokenLog')

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

    async function route(req, res) {
        let url = new URL(req.url, 'http://itk-sso')
        let p = url.pathname.replace(/\/+$/, '') || '/'
        let q = Object.fromEntries(url.searchParams)
        let m

        if (p === '/api/meta' && req.method === 'GET') {
            return send(res, 200, {grantTypes: GRANT_TYPES, knownScopes: KNOWN_SCOPES, events: EVENTS})
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
            let full = path.join(PUBLIC_DIR, file)
            if (full.startsWith(PUBLIC_DIR) && fs.existsSync(full) && fs.statSync(full).isFile()) {
                res.writeHead(200, {'content-type': MIME[path.extname(full)] || 'application/octet-stream'})
                return res.end(fs.readFileSync(full))
            }
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
