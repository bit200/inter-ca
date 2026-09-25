const crypto = require('crypto')
const path = require('path')
const JsonStore = require('./jsonStore')
const {DEFAULT_RESOURCES, byKey, normalizeResources} = require('./resources')

// Реестр OAuth-клиентов itk-sso. Клиент - это стороннее приложение, которому
// разрешено пускать людей через ITK: портал, CRM, мобильный кабинет.
// Что храним: идентификатор и секрет, куда разрешено возвращать пользователя
// (redirect_uri), какие данные клиент вправе запрашивать (scopes), какими
// способами он берёт токены (grant types), на какие ресурсы (aud) и с какими
// scope'ами на каждом ему можно выписывать токены, и включён ли он вообще.

const GRANT_TYPES = ['authorization_code', 'refresh_token', 'client_credentials']
const KNOWN_SCOPES = ['openid', 'profile', 'email', 'offline_access']
const SCOPE_RE = /^[A-Za-z0-9_.:-]+$/

class ValidationError extends Error {
    constructor(errors) {
        super(errors.map(e => e.message).join('; '))
        this.name = 'ValidationError'
        this.status = 422
        this.errors = errors
    }
}

class NotFoundError extends Error {
    constructor(id) {
        super('Клиент ' + id + ' не найден')
        this.name = 'NotFoundError'
        this.status = 404
    }
}

function hashSecret(secret, salt) {
    salt = salt || crypto.randomBytes(16).toString('hex')
    let hash = crypto.scryptSync(secret, salt, 32).toString('hex')
    return {salt, hash}
}

function newSecret() {
    return crypto.randomBytes(32).toString('base64url')
}

function newClientId(name) {
    // Читаемый префикс из названия + случайный хвост: в журнале токенов видно,
    // о каком приложении речь, но угадать чужой client_id нельзя.
    let slug = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)
    return (slug ? slug + '-' : 'client-') + crypto.randomBytes(6).toString('hex')
}

function isValidRedirectUri(value) {
    let url
    try {
        url = new URL(value)
    } catch (e) {
        return false
    }
    if (url.hash) return false
    if (url.protocol === 'https:') return true
    // http оставляем только для локальной разработки: в проде это утечка кода авторизации
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
}

function uniq(arr) {
    return arr.filter((v, i) => arr.indexOf(v) === i)
}

function normalizeList(value) {
    if (value === undefined || value === null) return null
    let arr = Array.isArray(value) ? value : String(value).split(/[\s,]+/)
    return uniq(arr.map(v => String(v).trim()).filter(Boolean))
}

function validate(client, catalog) {
    let errors = []
    if (!String(client.name || '').trim()) {
        errors.push({field: 'name', message: 'Укажите название приложения'})
    }
    let grantTypes = client.grantTypes || []
    if (!grantTypes.length) {
        errors.push({field: 'grantTypes', message: 'Выберите хотя бы один способ получения токена'})
    }
    for (let g of grantTypes) {
        if (GRANT_TYPES.indexOf(g) === -1) {
            errors.push({field: 'grantTypes', message: 'Неизвестный grant type: ' + g})
        }
    }
    if (grantTypes.indexOf('refresh_token') > -1 && grantTypes.indexOf('authorization_code') === -1) {
        errors.push({field: 'grantTypes', message: 'refresh_token выдаётся только вместе с authorization_code'})
    }
    let uris = client.redirectUris || []
    if (grantTypes.indexOf('authorization_code') > -1 && !uris.length) {
        errors.push({field: 'redirectUris', message: 'Для authorization_code нужен хотя бы один redirect_uri'})
    }
    for (let uri of uris) {
        if (!isValidRedirectUri(uri)) {
            errors.push({field: 'redirectUris', message: 'Адрес возврата не подходит: ' + uri + ' — нужен полный https-адрес без #'})
        }
    }
    let scopes = client.scopes || []
    if (!scopes.length) {
        errors.push({field: 'scopes', message: 'Укажите хотя бы один scope'})
    }
    for (let s of scopes) {
        if (!SCOPE_RE.test(s)) {
            errors.push({field: 'scopes', message: 'Недопустимый scope: ' + s})
        }
    }
    for (let r of client.resources || []) {
        let known = byKey(catalog, r.resource)
        if (!known) {
            errors.push({field: 'resources', message: 'Неизвестный ресурс: ' + (r.resource || '(пусто)')})
            continue
        }
        if (!r.scopes.length) {
            errors.push({field: 'resources', message: 'Для ресурса ' + r.resource + ' выберите хотя бы один scope'})
        }
        for (let s of r.scopes) {
            if (known.scopes.indexOf(s) === -1) {
                errors.push({field: 'resources', message: 'У ресурса ' + r.resource + ' нет scope ' + s})
            }
        }
    }
    if (errors.length) throw new ValidationError(errors)
}

// Наружу секрет отдаём только в момент создания или ротации: в реестре лежит
//scrypt-хеш, восстановить строку нельзя - её можно только перевыпустить.
function publicView(client) {
    let {secretHash, secretSalt, ...rest} = client
    return rest
}

class ClientRegistry {
    constructor(opts) {
        opts = opts || {}
        this.store = opts.store || new JsonStore(
            opts.file || path.join(__dirname, '..', 'data', 'clients.json'),
            {clients: []}
        )
        this.now = opts.now || (() => new Date().toISOString())
        this.resources = opts.resources || DEFAULT_RESOURCES
    }

    list(filter) {
        filter = filter || {}
        let clients = this.store.read().clients.map(publicView)
        if (filter.enabled !== undefined && filter.enabled !== '') {
            let want = filter.enabled === true || filter.enabled === 'true'
            clients = clients.filter(c => !!c.enabled === want)
        }
        if (filter.q) {
            let q = String(filter.q).toLowerCase()
            clients = clients.filter(c => (c.name + ' ' + c._id).toLowerCase().indexOf(q) > -1)
        }
        return clients.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
    }

    getRaw(id) {
        return this.store.read().clients.find(c => c._id === id) || null
    }

    get(id) {
        let client = this.getRaw(id)
        if (!client) throw new NotFoundError(id)
        return publicView(client)
    }

    create(body) {
        body = body || {}
        let client = {
            _id: newClientId(body.name),
            name: String(body.name || '').trim(),
            desc: String(body.desc || '').trim(),
            redirectUris: normalizeList(body.redirectUris) || [],
            scopes: normalizeList(body.scopes) || ['openid'],
            grantTypes: normalizeList(body.grantTypes) || ['authorization_code'],
            enabled: body.enabled === undefined ? true : !!body.enabled,
            cd: this.now(),
            ud: this.now(),
        }
        // Без поля resources (админка пока шлёт только scopes) ресурсы выводятся
        // из ресурсных scope'ов клиента - см. effectiveResources.
        if (body.resources !== undefined) client.resources = normalizeResources(body.resources) || []
        validate(client, this.resources)
        let secret = newSecret()
        let {salt, hash} = hashSecret(secret)
        client.secretSalt = salt
        client.secretHash = hash
        client.secretRotatedAt = client.cd
        this.store.update(data => data.clients.push(client))
        return {client: publicView(client), secret}
    }

    update(id, body) {
        let client = this.getRaw(id)
        if (!client) throw new NotFoundError(id)
        let next = {...client}
        if (body.name !== undefined) next.name = String(body.name).trim()
        if (body.desc !== undefined) next.desc = String(body.desc).trim()
        if (body.redirectUris !== undefined) next.redirectUris = normalizeList(body.redirectUris) || []
        if (body.scopes !== undefined) next.scopes = normalizeList(body.scopes) || []
        if (body.grantTypes !== undefined) next.grantTypes = normalizeList(body.grantTypes) || []
        if (body.resources !== undefined) next.resources = normalizeResources(body.resources) || []
        if (body.enabled !== undefined) next.enabled = !!body.enabled
        validate(next, this.resources)
        next.ud = this.now()
        this.store.update(data => {
            let ind = data.clients.findIndex(c => c._id === id)
            data.clients[ind] = next
        })
        return publicView(next)
    }

    setEnabled(id, enabled) {
        return this.update(id, {enabled: !!enabled})
    }

    rotateSecret(id) {
        let client = this.getRaw(id)
        if (!client) throw new NotFoundError(id)
        let secret = newSecret()
        let {salt, hash} = hashSecret(secret)
        let rotatedAt = this.now()
        this.store.update(data => {
            let c = data.clients.find(c => c._id === id)
            c.secretSalt = salt
            c.secretHash = hash
            c.secretRotatedAt = rotatedAt
            c.ud = rotatedAt
        })
        return {client: this.get(id), secret}
    }

    remove(id) {
        let client = this.getRaw(id)
        if (!client) throw new NotFoundError(id)
        this.store.update(data => {
            data.clients = data.clients.filter(c => c._id !== id)
        })
        return publicView(client)
    }

    // Проверка пары client_id/secret для /token: выключенный клиент секретом не
    // оправдывается - выключили, значит доступ закрыт немедленно.
    verifySecret(id, secret) {
        let client = this.getRaw(id)
        if (!client) return {ok: false, reason: 'unknown_client'}
        if (!client.enabled) return {ok: false, reason: 'disabled'}
        let {hash} = hashSecret(String(secret || ''), client.secretSalt)
        let a = Buffer.from(hash, 'hex')
        let b = Buffer.from(client.secretHash, 'hex')
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return {ok: false, reason: 'bad_secret'}
        return {ok: true, client: publicView(client)}
    }

    // Разрешён ли клиенту такой способ получения токена и такой адрес возврата.
    checkGrant(id, grantType, redirectUri) {
        let client = this.getRaw(id)
        if (!client) return {ok: false, reason: 'unknown_client'}
        if (!client.enabled) return {ok: false, reason: 'disabled'}
        if (client.grantTypes.indexOf(grantType) === -1) return {ok: false, reason: 'grant_not_allowed'}
        if (redirectUri !== undefined && client.redirectUris.indexOf(redirectUri) === -1) {
            return {ok: false, reason: 'redirect_uri_mismatch'}
        }
        return {ok: true, client: publicView(client)}
    }
}

module.exports = {
    ClientRegistry,
    ValidationError,
    NotFoundError,
    GRANT_TYPES,
    KNOWN_SCOPES,
    isValidRedirectUri,
    publicView,
}
