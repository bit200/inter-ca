const crypto = require('crypto')

// Замок на админку реестра. Отдельного каталога администраторов у сервиса нет,
// заводить его ради служебного экрана незачем, поэтому вход один - пароль из
// окружения (SSO_ADMIN_PASSWORD). После входа браузер носит подписанную HMAC
// куку со сроком годности: сервер ничего про сессию не помнит и переживает
// рестарт, а подделать куку без секрета нельзя.

const COOKIE = 'itk_sso_admin'
const TTL_MS = 12 * 3600 * 1000

function digest(value) {
    return crypto.createHash('sha256').update(String(value), 'utf-8').digest()
}

function sameString(a, b) {
    let x = digest(a)
    let y = digest(b)
    return crypto.timingSafeEqual(x, y)
}

function readCookie(req, name) {
    let raw = (req.headers && req.headers.cookie) || ''
    for (let part of raw.split(';')) {
        let i = part.indexOf('=')
        if (i < 0) continue
        if (part.slice(0, i).trim() !== name) continue
        return decodeURIComponent(part.slice(i + 1).trim())
    }
    return ''
}

function appendCookie(res, value) {
    let prev = res.getHeader('set-cookie')
    let list = prev ? (Array.isArray(prev) ? prev.slice() : [prev]) : []
    list.push(value)
    res.setHeader('set-cookie', list)
}

function createAuth(opts) {
    opts = opts || {}
    let password = String(opts.password || '')
    if (!password) throw new Error('Админке нужен пароль: задайте SSO_ADMIN_PASSWORD')
    // Секрет подписи по умолчанию выводим из пароля: сменили пароль - старые куки умерли.
    let secret = String(opts.secret || '') || 'itk-sso-admin:' + password
    let ttlMs = opts.ttlMs || TTL_MS

    function sign(exp) {
        return crypto.createHmac('sha256', secret).update(String(exp)).digest('hex')
    }

    return {
        cookieName: COOKIE,

        /** Пустил бы этот запрос? Кука должна быть живой и подписанной нашим секретом. */
        ok(req) {
            let raw = readCookie(req, COOKIE)
            let [exp, sig] = raw.split('.')
            if (!exp || !sig) return false
            if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false
            try {
                return sameString(sign(exp), sig)
            } catch (e) {
                return false
            }
        },

        matches(candidate) {
            if (!candidate) return false
            try {
                return sameString(candidate, password)
            } catch (e) {
                return false
            }
        },

        issue(req, res, base) {
            let exp = Date.now() + ttlMs
            let attrs = ['Path=' + (base || '/'), 'HttpOnly', 'SameSite=Lax', 'Max-Age=' + Math.floor(ttlMs / 1000)]
            if (isHttps(req)) attrs.push('Secure')
            appendCookie(res, COOKIE + '=' + exp + '.' + sign(exp) + '; ' + attrs.join('; '))
        },

        clear(req, res, base) {
            let attrs = ['Path=' + (base || '/'), 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
            if (isHttps(req)) attrs.push('Secure')
            appendCookie(res, COOKIE + '=; ' + attrs.join('; '))
        },
    }
}

function isHttps(req) {
    let proto = (req.headers && req.headers['x-forwarded-proto']) || ''
    return String(proto).split(',')[0].trim() === 'https'
}

/** Случайный пароль на локальный стенд: печатаем в консоль, чтобы было чем войти. */
function randomPassword() {
    return crypto.randomBytes(9).toString('base64url')
}

module.exports = {createAuth, randomPassword, readCookie, COOKIE}
