const crypto = require('crypto')
const path = require('path')
const JsonStore = require('./jsonStore')

// Журнал выдачи и отзыва токенов. Нужен, чтобы на вопрос "кто и когда получил
// доступ от имени этого приложения" был ответ без чтения логов nginx: одна
// строка на каждое событие токена.
// Сам токен в журнал не кладём - только jti (его идентификатор): журнал читают
// люди, и он не должен становиться складом действующих ключей.

const EVENTS = ['issued', 'revoked', 'denied']
const TOKEN_TYPES = ['access', 'refresh', 'id']
const DEFAULT_LIMIT = 100
const MAX_EVENTS = 5000

class TokenLog {
    constructor(opts) {
        opts = opts || {}
        this.store = opts.store || new JsonStore(
            opts.file || path.join(__dirname, '..', 'data', 'token-log.json'),
            {events: []}
        )
        this.now = opts.now || (() => new Date().toISOString())
        this.maxEvents = opts.maxEvents || MAX_EVENTS
    }

    record(event) {
        event = event || {}
        if (EVENTS.indexOf(event.event) === -1) {
            throw new Error('Неизвестное событие токена: ' + event.event)
        }
        let row = {
            _id: crypto.randomBytes(8).toString('hex'),
            cd: event.cd || this.now(),
            event: event.event,
            tokenType: TOKEN_TYPES.indexOf(event.tokenType) > -1 ? event.tokenType : 'access',
            clientId: event.clientId || '',
            clientName: event.clientName || '',
            subject: event.subject || '',
            grantType: event.grantType || '',
            scopes: Array.isArray(event.scopes) ? event.scopes : (event.scopes ? String(event.scopes).split(/[\s,]+/).filter(Boolean) : []),
            jti: event.jti || '',
            reason: event.reason || '',
            ip: event.ip || '',
        }
        this.store.update(data => {
            data.events.push(row)
            if (data.events.length > this.maxEvents) {
                data.events = data.events.slice(data.events.length - this.maxEvents)
            }
        })
        return row
    }

    issued(event) {
        return this.record({...event, event: 'issued'})
    }

    revoked(event) {
        return this.record({...event, event: 'revoked'})
    }

    denied(event) {
        return this.record({...event, event: 'denied'})
    }

    // Новые события сверху: журнал читают с последнего, а не с первого.
    list(filter) {
        filter = filter || {}
        let events = this.store.read().events.slice()
        if (filter.clientId) events = events.filter(e => e.clientId === filter.clientId)
        if (filter.event) events = events.filter(e => e.event === filter.event)
        if (filter.subject) events = events.filter(e => e.subject === filter.subject)
        if (filter.since) events = events.filter(e => e.cd >= filter.since)
        events.reverse()
        let limit = Math.min(Number(filter.limit) || DEFAULT_LIMIT, 1000)
        return events.slice(0, limit)
    }

    // Сводка по клиенту для карточки: сколько выдано, сколько отозвано, когда
    // последний раз видели.
    statsFor(clientId) {
        let events = this.store.read().events.filter(e => e.clientId === clientId)
        let stats = {issued: 0, revoked: 0, denied: 0, lastAt: ''}
        for (let e of events) {
            if (stats[e.event] !== undefined) stats[e.event]++
            if (e.cd > stats.lastAt) stats.lastAt = e.cd
        }
        return stats
    }
}

module.exports = {TokenLog, EVENTS, TOKEN_TYPES}
