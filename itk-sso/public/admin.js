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

// ── реестр слева ───────────────────────────────────────────────────────
function renderList() {
    let html = state.clients.map(c => {
        let grants = (c.grantTypes || []).map(g => ({
            authorization_code: 'код авторизации',
            refresh_token: 'обновление',
            client_credentials: 'служебный',
        }[g] || g)).join(' · ')
        let stats = c.tokenStats || {}
        return `<li><button type="button" class="row ${c.enabled ? '' : 'row--off'} ${c._id === state.selectedId ? 'is-active' : ''}" data-id="${esc(c._id)}">
            <span class="row__name">${esc(c.name)}</span>
            <span class="row__id">${esc(c._id)}</span>
            <span class="row__meta">${esc(grants)}${stats.issued ? ' · выдано ' + stats.issued : ''}</span>
        </button></li>`
    }).join('')
    $('#clientList').innerHTML = html || `<li class="empty"><strong>Пока ни одного приложения</strong>Нажмите «Новый клиент», чтобы завести первое.</li>`
}

// ── карточка справа ────────────────────────────────────────────────────
function renderDetail() {
    let d = state.draft
    if (!d) {
        $('#detail').innerHTML = `<div class="empty"><strong>Выберите приложение</strong>Слева — все, кому разрешено пускать людей через ITK.</div>`
        return
    }
    let isNew = !d._id
    let scopePool = [...new Set([...(state.meta.knownScopes || []), ...(d.scopes || [])])]
    let grantNames = {
        authorization_code: 'Код авторизации — вход человека',
        refresh_token: 'Обновление — продлить вход без пароля',
        client_credentials: 'Служебный — приложение от своего имени',
    }
    $('#detail').innerHTML = `
        <div class="detail__head">
            <div>
                <h3>${isNew ? 'Новое приложение' : esc(d.name || 'Без названия')}</h3>
                ${isNew ? '<div class="form__hint">client_id и секрет выдадутся при сохранении.</div>'
                        : `<div class="detail__id">${esc(d._id)}</div>`}
            </div>
            <button type="button" class="state ${d.enabled ? '' : 'state--off'}" id="toggleEnabled">
                <span class="state__dot"></span>${d.enabled ? 'Включено' : 'Выключено'}
            </button>
        </div>

        ${state.secretOnce ? `<div class="secret" style="margin-top:16px">
            <div><strong>Секрет клиента</strong> — сохраните его сейчас, повторно он не покажется.</div>
            <code id="secretValue">${esc(state.secretOnce)}</code>
            <div><button type="button" class="btn" id="copySecret">Скопировать секрет</button></div>
        </div>` : ''}

        ${state.errors.length ? `<div class="errors" style="margin-top:14px">${state.errors.map(e => '<div>' + esc(e.message || e) + '</div>').join('')}</div>` : ''}

        <div class="form">
            <div class="form__row">
                <label for="f-name">Название</label>
                <input id="f-name" class="field" value="${esc(d.name || '')}" placeholder="Портал развития">
            </div>
            <div class="form__row">
                <label for="f-desc">Зачем это приложение</label>
                <input id="f-desc" class="field" value="${esc(d.desc || '')}" placeholder="Вход кандидатов в портал">
            </div>
            <div class="form__row">
                <label for="f-uris">Адреса возврата</label>
                <textarea id="f-uris" class="field" placeholder="https://portal.itk.academy/auth/callback">${esc((d.redirectUris || []).join('\n'))}</textarea>
                <div class="form__hint">По одному в строке. Только https — или http для localhost.</div>
            </div>
            <div class="form__row">
                <label>Что приложение может запрашивать</label>
                <div class="chips" id="scopeChips">
                    ${scopePool.map(s => `<button type="button" class="chip ${(d.scopes || []).includes(s) ? 'is-on' : ''}" data-scope="${esc(s)}"><code>${esc(s)}</code></button>`).join('')}
                </div>
                <div style="display:flex;gap:8px">
                    <input id="f-scope" class="field" placeholder="Добавить свой scope">
                    <button type="button" class="btn" id="addScope">Добавить</button>
                </div>
            </div>
            <div class="form__row">
                <label>Как приложение получает токены</label>
                <div class="chips" id="grantChips">
                    ${(state.meta.grantTypes || []).map(g => `<button type="button" class="chip ${(d.grantTypes || []).includes(g) ? 'is-on' : ''}" data-grant="${esc(g)}">${esc(grantNames[g] || g)}</button>`).join('')}
                </div>
            </div>
            <div class="actions">
                <button type="button" class="btn btn--primary" id="save">${isNew ? 'Завести приложение' : 'Сохранить изменения'}</button>
                ${isNew ? '' : '<button type="button" class="btn" id="rotate">Перевыпустить секрет</button>'}
                <span class="actions__spacer"></span>
                ${isNew ? '<button type="button" class="btn btn--ghost" id="cancel">Отменить</button>'
                        : '<button type="button" class="btn btn--danger" id="remove">Удалить</button>'}
            </div>
        </div>`

    bindDetail()
}

function bindDetail() {
    let d = state.draft
    let bind = (sel, ev, fn) => { let el = $(sel); if (el) el.addEventListener(ev, fn) }

    bind('#f-name', 'input', e => d.name = e.target.value)
    bind('#f-desc', 'input', e => d.desc = e.target.value)
    bind('#f-uris', 'input', e => d.redirectUris = e.target.value.split('\n').map(s => s.trim()).filter(Boolean))
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
    document.querySelectorAll('#scopeChips .chip').forEach(el => el.addEventListener('click', () => {
        let s = el.dataset.scope
        d.scopes = (d.scopes || []).includes(s) ? d.scopes.filter(x => x !== s) : [...(d.scopes || []), s]
        renderDetail()
    }))
    document.querySelectorAll('#grantChips .chip').forEach(el => el.addEventListener('click', () => {
        let g = el.dataset.grant
        d.grantTypes = (d.grantTypes || []).includes(g) ? d.grantTypes.filter(x => x !== g) : [...(d.grantTypes || []), g]
        renderDetail()
    }))
    bind('#save', 'click', save)
    bind('#rotate', 'click', rotate)
    bind('#remove', 'click', remove)
    bind('#cancel', 'click', () => { state.draft = null; state.errors = []; renderDetail() })
}

// ── действия ───────────────────────────────────────────────────────────
async function save() {
    let d = state.draft
    state.errors = []
    try {
        if (!d._id) {
            let res = await api('POST', 'api/clients', d)
            state.secretOnce = res.secret
            state.selectedId = res.item._id
            state.draft = {...res.item}
            toast('Приложение заведено')
        } else {
            let res = await api('PUT', 'api/clients/' + encodeURIComponent(d._id), d)
            state.draft = {...res.item}
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
    if (!confirm('Удалить «' + (state.draft.name || state.draft._id) + '»? Его токены перестанут приниматься.')) return
    await api('DELETE', 'api/clients/' + encodeURIComponent(state.draft._id))
    state.draft = null
    state.selectedId = null
    state.secretOnce = ''
    await loadClients()
    await loadJournal()
    renderDetail()
    toast('Приложение удалено')
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
        state.draft = {name: '', desc: '', redirectUris: [], scopes: ['openid'], grantTypes: ['authorization_code'], enabled: true}
        renderList()
        renderDetail()
    })

    $('#clientList').addEventListener('click', async e => {
        let btn = e.target.closest('.row')
        if (!btn) return
        state.selectedId = btn.dataset.id
        state.secretOnce = ''
        state.errors = []
        state.draft = {...state.clients.find(c => c._id === state.selectedId)}
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
