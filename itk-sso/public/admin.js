// Админка реестра OAuth-клиентов. Ванильный JS: сервис служебный, отдельная
// сборка фронта ради семи ручек не окупается.

let state = {
    clients: [],
    meta: {grantTypes: [], knownScopes: []},
    selectedId: null,
    draft: null,          // редактируемая копия карточки; null - ничего не открыто
    secretOnce: '',       // секрет, показанный один раз после создания/ротации
    errors: [],
    filter: {enabled: '', q: ''},
    journal: {event: '', items: []},
}

let $ = sel => document.querySelector(sel)

async function api(method, path, body) {
    let res = await fetch(path, {
        method,
        headers: body ? {'content-type': 'application/json'} : {},
        body: body ? JSON.stringify(body) : undefined,
    })
    let data = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(data.error || 'Запрос не прошёл'), {errors: data.errors || []})
    return data
}

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]))
}

function when(iso) {
    if (!iso) return '—'
    let d = new Date(iso)
    if (isNaN(d)) return '—'
    return d.toLocaleString('ru-RU', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})
}

function toast(text) {
    let el = document.createElement('div')
    el.className = 'toast'
    el.textContent = text
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 2400)
}

// Тип подключения словами человека. grant types сервер выводит из него сам.
const KIND_TEXT = {
    service: {title: 'Сервер к серверу', hint: 'Система сама берёт токен для API, без участия человека'},
    login: {title: 'Вход пользователей', hint: 'Кнопка «Войти через ITK» на стороне системы'},
    both: {title: 'Оба сценария', hint: 'И вход людей, и запросы от своего имени'},
}

// ── реестр слева ───────────────────────────────────────────────────────
function renderList() {
    let html = state.clients.map(c => {
        let kind = (KIND_TEXT[c.kind] || {}).title || ''
        let party = c.firstParty ? 'своя' : 'сторонняя'
        let stats = c.tokenStats || {}
        return `<li><button type="button" class="row ${c.enabled ? '' : 'row--off'} ${c._id === state.selectedId ? 'is-active' : ''}" data-id="${esc(c._id)}">
            <span class="row__name">${esc(c.name)}</span>
            <span class="row__id">${esc(c._id)}</span>
            <span class="row__meta">${esc(kind)}, ${party}${c.owner ? ', ' + esc(c.owner) : ''}${stats.issued ? ' · выдано ' + stats.issued : ''}</span>
        </button></li>`
    }).join('')
    $('#clientList').innerHTML = html || `<li class="empty"><strong>Пока ни одной системы</strong>Нажмите «Подключить систему», чтобы завести первую.</li>`
}

// ── карточка справа ────────────────────────────────────────────────────
function renderDetail() {
    let d = state.draft
    if (!d) {
        $('#detail').innerHTML = `<div class="empty"><strong>Выберите систему</strong>Слева — все, кому разрешено пускать людей через ITK или ходить в API.</div>`
        return
    }
    let isNew = !d._id
    // Плашку о выключении показываем по сохранённому состоянию, а не по черновику.
    let saved = isNew ? null : state.clients.find(c => c._id === d._id)
    let kind = d.kind || 'login'
    let people = kind !== 'service'
    let scopePool = [...new Set([...(state.meta.knownScopes || []), ...(d.scopes || [])])]
    let granted = r => ((d.resources || []).find(x => x.resource === r.key) || {scopes: []}).scopes
    $('#detail').innerHTML = `
        <div class="detail__head">
            <div>
                <h3>${isNew ? 'Новая система' : esc(d.name || 'Без названия')}</h3>
                ${isNew ? '<div class="form__hint">client_id и секрет выдадутся при сохранении, секрет — один раз.</div>'
                        : `<div class="detail__id">${esc(d._id)}</div>`}
            </div>
            <button type="button" class="state ${d.enabled ? '' : 'state--off'}" id="toggleEnabled">
                <span class="state__dot"></span>${d.enabled ? 'Включено' : 'Выключено'}
            </button>
        </div>

        ${saved && !saved.enabled ? `<div class="notice">Система выключена: её refresh token'ы погашены, новых токенов она не получит.
            Уже выданный access token доживает свой срок — не больше 15 минут.</div>` : ''}

        ${state.secretOnce ? `<div class="secret" style="margin-top:16px">
            <div><strong>Секрет клиента</strong> — сохраните его сейчас, повторно он не покажется. В реестре лежит только хэш.</div>
            <code id="secretValue">${esc(state.secretOnce)}</code>
            <div><button type="button" class="btn" id="copySecret">Скопировать секрет</button></div>
        </div>` : ''}

        ${state.errors.length ? `<div class="errors" style="margin-top:14px">${state.errors.map(e => '<div>' + esc(e.message || e) + '</div>').join('')}</div>` : ''}

        <div class="form">
            <fieldset class="form__row kinds" id="kindPick">
                <legend>Что подключаем</legend>
                ${Object.keys(KIND_TEXT).map(k => `<label class="kind ${k === kind ? 'is-on' : ''}">
                    <input type="radio" name="kind" value="${k}" ${k === kind ? 'checked' : ''}>
                    <span class="kind__title">${KIND_TEXT[k].title}</span>
                    <span class="kind__hint">${KIND_TEXT[k].hint}</span>
                </label>`).join('')}
            </fieldset>

            <div class="form__pair">
                <div class="form__row">
                    <label for="f-name">Название</label>
                    <input id="f-name" class="field" value="${esc(d.name || '')}" placeholder="HR-система партнёра">
                </div>
                <div class="form__row">
                    <label for="f-desc">Зачем подключаем</label>
                    <input id="f-desc" class="field" value="${esc(d.desc || '')}" placeholder="Кандидаты входят со своими оценками">
                </div>
                <div class="form__row">
                    <label for="f-owner">Владелец</label>
                    <input id="f-owner" class="field" value="${esc(d.owner || '')}" placeholder="ООО «Партнёр», команда HR-tech">
                </div>
                <div class="form__row">
                    <label for="f-contact">Контакт</label>
                    <input id="f-contact" class="field" value="${esc(d.contact || '')}" placeholder="it@partner.example или @telegram">
                </div>
            </div>

            ${people ? `<div class="form__row">
                <label>Чья система</label>
                <div class="seg" role="group" aria-label="Чья система" id="partyPick">
                    <button type="button" class="seg__btn ${d.firstParty ? 'is-on' : ''}" data-party="first">Наша, ITK</button>
                    <button type="button" class="seg__btn ${d.firstParty ? '' : 'is-on'}" data-party="third">Сторонняя</button>
                </div>
                <div class="form__hint">${d.firstParty
                    ? 'Человек входит сразу, экран согласия не показываем.'
                    : 'При первом входе человек увидит, к чему система просит доступ, и решит сам.'}</div>
            </div>
            <div class="form__pair">
                <div class="form__row">
                    <label for="f-uris">Адреса возврата (redirect_uri)</label>
                    <textarea id="f-uris" class="field" placeholder="https://hr.partner.example/auth/callback">${esc((d.redirectUris || []).join('\n'))}</textarea>
                    <div class="form__hint">По одному в строке. Только https — или http для localhost.</div>
                </div>
                <div class="form__row">
                    <label for="f-logout">После выхода (post_logout_redirect_uri)</label>
                    <textarea id="f-logout" class="field" placeholder="https://hr.partner.example/">${esc((d.postLogoutRedirectUris || []).join('\n'))}</textarea>
                    <div class="form__hint">Куда вернуть человека после выхода из ITK. Можно оставить пустым.</div>
                </div>
            </div>` : ''}

            <div class="form__row">
                <label>К каким API пускаем</label>
                <ul class="apis" id="resourcePick">
                    ${(state.meta.resources || []).map(r => `<li class="api ${granted(r).length ? 'is-on' : ''}">
                        <div class="api__name">${esc(r.name)}<code>${esc(r.audience)}</code></div>
                        <div class="chips">
                            ${r.scopes.map(s => `<button type="button" class="chip ${granted(r).includes(s) ? 'is-on' : ''}" data-resource="${esc(r.key)}" data-scope="${esc(s)}"><code>${esc(s)}</code></button>`).join('')}
                        </div>
                    </li>`).join('')}
                </ul>
                <div class="form__hint">Токен на API выписывается только с отмеченными scope'ами. Ничего не отмечено — системе этот API закрыт.</div>
            </div>
            <div class="form__row">
                <label>Что система может запрашивать</label>
                <div class="chips" id="scopeChips">
                    ${scopePool.map(s => `<button type="button" class="chip ${(d.scopes || []).includes(s) ? 'is-on' : ''}" data-scope="${esc(s)}"><code>${esc(s)}</code></button>`).join('')}
                </div>
                <div style="display:flex;gap:8px">
                    <input id="f-scope" class="field" placeholder="Добавить свой scope">
                    <button type="button" class="btn" id="addScope">Добавить</button>
                </div>
            </div>
            <div class="actions">
                <button type="button" class="btn btn--primary" id="save">${isNew ? 'Подключить систему' : 'Сохранить изменения'}</button>
                ${isNew ? '' : '<button type="button" class="btn" id="rotate">Перевыпустить секрет</button>'}
                <span class="actions__spacer"></span>
                ${isNew ? '<button type="button" class="btn btn--ghost" id="cancel">Отменить</button>'
                        : '<button type="button" class="btn btn--danger" id="remove">Удалить</button>'}
            </div>
        </div>`

    bindDetail()
}

function toggle(list, value) {
    list = list || []
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value]
}

function lines(value) {
    return value.split('\n').map(s => s.trim()).filter(Boolean)
}

function bindDetail() {
    let d = state.draft
    let bind = (sel, ev, fn) => { let el = $(sel); if (el) el.addEventListener(ev, fn) }

    bind('#f-name', 'input', e => d.name = e.target.value)
    bind('#f-desc', 'input', e => d.desc = e.target.value)
    bind('#f-owner', 'input', e => d.owner = e.target.value)
    bind('#f-contact', 'input', e => d.contact = e.target.value)
    bind('#f-uris', 'input', e => d.redirectUris = lines(e.target.value))
    bind('#f-logout', 'input', e => d.postLogoutRedirectUris = lines(e.target.value))
    bind('#toggleEnabled', 'click', () => { d.enabled = !d.enabled; renderDetail() })
    bind('#copySecret', 'click', () => {
        navigator.clipboard.writeText(state.secretOnce).then(() => toast('Секрет скопирован'), () => toast('Скопируйте вручную'))
    })
    bind('#addScope', 'click', () => {
        let val = ($('#f-scope').value || '').trim()
        if (!val) return
        d.scopes = [...new Set([...(d.scopes || []), val])]
        renderDetail()
    })
    document.querySelectorAll('#kindPick input').forEach(el => el.addEventListener('change', () => {
        d.kind = el.value
        // Серверу к серверу адреса возврата не нужны: не отправляем их, чтобы не спорить с проверкой.
        if (d.kind === 'service') { d.redirectUris = []; d.postLogoutRedirectUris = [] }
        renderDetail()
        let picked = document.querySelector('#kindPick input:checked')
        if (picked) picked.focus()
    }))
    document.querySelectorAll('#partyPick .seg__btn').forEach(el => el.addEventListener('click', () => {
        d.firstParty = el.dataset.party === 'first'
        renderDetail()
    }))
    document.querySelectorAll('#resourcePick .chip').forEach(el => el.addEventListener('click', () => {
        let key = el.dataset.resource
        let rest = (d.resources || []).filter(x => x.resource !== key)
        let scopes = toggle(((d.resources || []).find(x => x.resource === key) || {}).scopes, el.dataset.scope)
        // Ресурс без scope'ов реестр не примет - снятый последний scope снимает и ресурс.
        d.resources = scopes.length ? [...rest, {resource: key, scopes}] : rest
        renderDetail()
    }))
    document.querySelectorAll('#scopeChips .chip').forEach(el => el.addEventListener('click', () => {
        d.scopes = toggle(d.scopes, el.dataset.scope)
        renderDetail()
    }))
    bind('#save', 'click', save)
    bind('#rotate', 'click', rotate)
    bind('#remove', 'click', remove)
    bind('#cancel', 'click', () => { state.draft = null; state.errors = []; renderDetail() })
}

// Запись, заведённая до каталога ресурсов, держит их в scopes (mesh:read) - сервер
// выводит ресурсы из них сам (effectiveResources), показываем так же.
function withResources(c) {
    if (Array.isArray(c.resources)) return c
    let scopes = c.scopes || []
    c.resources = (state.meta.resources || [])
        .map(r => ({resource: r.key, scopes: r.scopes.filter(s => scopes.includes(s))}))
        .filter(r => r.scopes.length)
    return c
}

// ── действия ───────────────────────────────────────────────────────────
async function save() {
    let d = state.draft
    state.errors = []
    // grant types сервер выводит из типа подключения - отдельно их не шлём.
    let {grantTypes, tokenStats, ...body} = d
    try {
        if (!d._id) {
            let res = await api('POST', 'api/clients', body)
            state.secretOnce = res.secret
            state.selectedId = res.item._id
            state.draft = withResources({...res.item})
            toast('Система подключена')
        } else {
            let res = await api('PUT', 'api/clients/' + encodeURIComponent(d._id), body)
            state.draft = withResources({...res.item})
            toast('Изменения сохранены')
        }
        await loadClients()
    } catch (e) {
        state.errors = e.errors && e.errors.length ? e.errors : [{message: e.message}]
    }
    renderDetail()
}

async function rotate() {
    if (!confirm('Старый секрет сразу перестанет работать. Перевыпустить?')) return
    let res = await api('POST', 'api/clients/' + encodeURIComponent(state.draft._id) + '/secret')
    state.secretOnce = res.secret
    state.draft = {...res.item}
    toast('Секрет перевыпущен')
    renderDetail()
}

async function remove() {
    if (!confirm('Удалить «' + (state.draft.name || state.draft._id) + '»? Его refresh token\'ы погаснут сразу.')) return
    await api('DELETE', 'api/clients/' + encodeURIComponent(state.draft._id))
    state.draft = null
    state.selectedId = null
    state.secretOnce = ''
    await loadClients()
    await loadJournal()
    renderDetail()
    toast('Система удалена')
}

// ── журнал ─────────────────────────────────────────────────────────────
function renderJournal() {
    let names = {issued: 'выдан', revoked: 'отозван', denied: 'отказ'}
    let types = {access: 'access', refresh: 'refresh', id: 'id'}
    let byId = Object.fromEntries(state.clients.map(c => [c._id, c.name]))
    let rows = state.journal.items.map(e => `<tr>
        <td class="journal__time">${esc(when(e.cd))}</td>
        <td class="ev ev--${esc(e.event)}">${esc(names[e.event] || e.event)}</td>
        <td>${esc(types[e.tokenType] || e.tokenType)}</td>
        <td>${esc(byId[e.clientId] || e.clientId || '—')}</td>
        <td>${esc(e.subject || '—')}</td>
        <td>${esc((e.scopes || []).join(' ')) || '—'}</td>
        <td class="journal__jti">${esc(e.jti || '—')}</td>
        <td>${esc(e.reason || '')}</td>
    </tr>`).join('')

    $('#journalTable').innerHTML = `
        <thead><tr>
            <th>Когда</th><th>Событие</th><th>Токен</th><th>Приложение</th>
            <th>Пользователь</th><th>Scopes</th><th>jti</th><th>Причина</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="8" class="empty"><strong>Событий пока нет</strong>Здесь появится каждая выдача и каждый отзыв токена.</td></tr>`}</tbody>`

    $('#journalScope').textContent = state.selectedId
        ? 'по приложению ' + (byId[state.selectedId] || state.selectedId)
        : 'по всем приложениям'
}

// ── загрузка ───────────────────────────────────────────────────────────
async function loadClients() {
    let qs = new URLSearchParams()
    if (state.filter.enabled !== '') qs.set('enabled', state.filter.enabled)
    if (state.filter.q) qs.set('q', state.filter.q)
    state.clients = (await api('GET', 'api/clients?' + qs)).items
    renderList()
}

async function loadJournal() {
    let qs = new URLSearchParams({limit: '200'})
    if (state.selectedId) qs.set('clientId', state.selectedId)
    if (state.journal.event) qs.set('event', state.journal.event)
    state.journal.items = (await api('GET', 'api/token-log?' + qs)).items
    renderJournal()
}

function segment(container, key, onPick) {
    container.querySelectorAll('.seg__btn').forEach(btn => btn.addEventListener('click', () => {
        container.querySelectorAll('.seg__btn').forEach(b => b.classList.remove('is-on'))
        btn.classList.add('is-on')
        onPick(btn.dataset[key])
    }))
}

async function start() {
    state.meta = await api('GET', 'api/meta')

    $('#logout').addEventListener('click', async () => {
        await api('POST', 'logout')
        location.reload()
    })

    $('#addClient').addEventListener('click', () => {
        state.selectedId = null
        state.secretOnce = ''
        state.errors = []
        state.draft = {
            name: '', desc: '', owner: '', contact: '', kind: 'login', firstParty: false,
            redirectUris: [], postLogoutRedirectUris: [], resources: [], scopes: ['openid'], enabled: true,
        }
        renderList()
        renderDetail()
    })

    $('#clientList').addEventListener('click', async e => {
        let btn = e.target.closest('.row')
        if (!btn) return
        state.selectedId = btn.dataset.id
        state.secretOnce = ''
        state.errors = []
        state.draft = withResources({...state.clients.find(c => c._id === state.selectedId)})
        renderList()
        renderDetail()
        await loadJournal()
    })

    $('#search').addEventListener('input', e => {
        state.filter.q = e.target.value
        loadClients()
    })

    segment(document.querySelector('.registry .seg'), 'enabled', v => {
        state.filter.enabled = v
        loadClients()
    })
    segment(document.querySelector('.journal .seg'), 'event', v => {
        state.journal.event = v
        loadJournal()
    })

    await loadClients()
    await loadJournal()
    renderDetail()
}

start()
