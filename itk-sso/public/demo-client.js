'use strict';

/* Браузерная половина демо-«внешней системы»: PKCE, обмен кода, обновление и выход.
   Секрета здесь нет — демо-клиент публичный, подлинность запроса доказывает code_verifier. */

(function () {
    var S = window.DEMO;
    var KEY = 'itk-demo-state';
    var el = function (id) { return document.getElementById(id); };
    var steps = [];
    var tokens = null;
    var ticker = null;

    function saveSession(data) {
        try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* приватное окно — переживём */ }
    }
    function loadSession() {
        try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
    }
    function patchSession(patch) {
        var data = loadSession() || {};
        for (var k in patch) data[k] = patch[k];
        saveSession(data);
        return data;
    }

    function b64url(bytes) {
        var s = '';
        for (var i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
        return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function randomString() {
        return b64url(crypto.getRandomValues(new Uint8Array(32)));
    }
    function challengeFor(verifier) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
            .then(function (buf) { return b64url(new Uint8Array(buf)); });
    }

    function decodeJwt(token) {
        var parts = String(token || '').split('.');
        if (parts.length < 2) return null;
        var part = function (i) {
            var raw = parts[i].replace(/-/g, '+').replace(/_/g, '/');
            var json = decodeURIComponent(Array.prototype.map.call(atob(raw), function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(json);
        };
        try { return { header: part(0), payload: part(1) }; } catch (e) { return null; }
    }

    function step(text, detail, bad) {
        steps.push({ text: text, detail: detail, bad: bad });
        // Лог переживает уход на /auth и возврат: иначе первые шаги (state, PKCE) человек не увидит.
        patchSession({ steps: steps });
        renderSteps();
    }
    function renderSteps() {
        var list = el('flow');
        list.textContent = '';
        if (!steps.length) {
            var empty = document.createElement('li');
            empty.className = 'muted';
            empty.textContent = 'Пока ничего не происходило — начните с кнопки «Войти через ITK».';
            list.appendChild(empty);
            return;
        }
        steps.forEach(function (s) {
            var li = document.createElement('li');
            if (s.bad) li.className = 'bad';
            li.appendChild(document.createTextNode(s.text));
            if (s.detail) {
                li.appendChild(document.createElement('br'));
                var code = document.createElement('code');
                code.textContent = s.detail;
                li.appendChild(code);
            }
            list.appendChild(li);
        });
    }

    function showJwt(rowId, preId, token) {
        var parsed = decodeJwt(token);
        el(rowId).hidden = false;
        el(preId).textContent = parsed
            ? 'header ' + JSON.stringify(parsed.header, null, 2) + '\n\npayload ' + JSON.stringify(parsed.payload, null, 2)
            : String(token || '');
    }

    function mmss(seconds) {
        if (seconds <= 0) return '00:00';
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function startClock() {
        if (ticker) clearInterval(ticker);
        var clock = el('clock');
        if (!tokens || !tokens.expiresAt) { clock.hidden = true; return; }
        clock.hidden = false;
        var tick = function () {
            var left = Math.round((tokens.expiresAt - Date.now()) / 1000);
            el('clockValue').textContent = mmss(left);
            clock.classList.toggle('is-out', left <= 0);
            if (left <= 0) setState('Access token истёк — обновите токен', 'is-bad');
        };
        tick();
        ticker = setInterval(tick, 1000);
    }

    function setState(text, cls) {
        var node = el('state');
        node.className = 'state' + (cls ? ' ' + cls : '');
        node.textContent = text;
    }

    function renderTokens() {
        el('refresh').disabled = !(tokens && tokens.refresh_token);
        el('logout').disabled = !(tokens && tokens.refresh_token);
        if (!tokens) { setState('Вход не выполнен'); return; }

        showJwt('idRow', 'idToken', tokens.id_token);
        showJwt('accessRow', 'accessToken', tokens.access_token);

        if (tokens.refresh_token) {
            el('refreshRow').hidden = false;
            el('refreshToken').textContent = tokens.refresh_token;
        }

        var claims = decodeJwt(tokens.id_token);
        var who = claims && claims.payload && (claims.payload.name || claims.payload.preferred_username || claims.payload.sub);
        setState(who ? 'Вошли как ' + who : 'Токены получены', 'is-in');
        startClock();
    }

    function form(data) {
        return new URLSearchParams(data).toString();
    }
    function postToken(data) {
        return fetch('/token', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: form(data),
        }).then(function (res) {
            return res.json().then(function (body) { return { status: res.status, body: body }; });
        });
    }

    function acceptTokens(body) {
        tokens = {
            access_token: body.access_token,
            id_token: body.id_token,
            // При обновлении refresh может не прийти — тогда остаётся прежний.
            refresh_token: body.refresh_token || (tokens && tokens.refresh_token) || null,
            expiresAt: Date.now() + (body.expires_in || 0) * 1000,
            scope: body.scope,
        };
        patchSession({ tokens: tokens });
        renderTokens();
        loadUserinfo();
    }

    function loadUserinfo() {
        if (!tokens || !tokens.access_token) return;
        fetch('/me', { headers: { authorization: 'Bearer ' + tokens.access_token } })
            .then(function (res) {
                return res.text().then(function (text) {
                    var body;
                    try { body = JSON.parse(text); } catch (e) { body = text; }
                    el('userinfoRow').hidden = false;
                    el('userinfo').textContent = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
                    var note = el('userinfoNote');
                    if (res.ok) {
                        note.hidden = true;
                        return;
                    }
                    note.hidden = false;
                    note.className = 'note is-bad';
                    // Ожидаемый отказ, а не поломка демо: access token выписан на ресурс-сервер
                    // (aud = SSO_DEFAULT_RESOURCE), а userinfo такие токены не принимает.
                    note.textContent = 'userinfo ответил ' + res.status + '. Access token выдан для ресурса из'
                        + ' SSO_DEFAULT_RESOURCE (claim aud), а /me по спецификации принимает только токены без aud.'
                        + ' Профиль в этом случае берут из id_token выше.';
                });
            });
    }

    function login() {
        var state = randomString();
        var verifier = randomString();
        challengeFor(verifier).then(function (challenge) {
            patchSession({ pending: { state: state, verifier: verifier } });
            step('Сгенерировали state и code_verifier, посчитали code_challenge (S256)', 'state=' + state);
            var url = '/auth?' + form({
                client_id: S.clientId,
                response_type: 'code',
                redirect_uri: S.redirectUri,
                scope: S.scope,
                state: state,
                code_challenge: challenge,
                code_challenge_method: 'S256',
                // offline_access выдают только со спрошенным согласием — иначе refresh не придёт.
                prompt: 'consent',
            });
            step('Уходим на /auth провайдера', url);
            location.href = url;
        });
    }

    function handleCallback(params) {
        var saved = loadSession() || {};
        var pending = saved.pending || {};
        history.replaceState(null, '', '/demo');

        if (params.get('error')) {
            step('Провайдер вернул ошибку: ' + params.get('error'), params.get('error_description') || '', true);
            setState('Вход не выполнен', 'is-bad');
            return;
        }
        if (!params.get('state') || params.get('state') !== pending.state) {
            step('state не совпал — ответ отброшен, код на токены не меняем', 'ждали ' + (pending.state || '—') + ', пришло ' + (params.get('state') || '—'), true);
            setState('state не совпал', 'is-bad');
            return;
        }

        step('Вернулись на redirect_uri, state совпал', 'code=' + params.get('code'));
        patchSession({ pending: null });

        postToken({
            grant_type: 'authorization_code',
            code: params.get('code'),
            redirect_uri: S.redirectUri,
            client_id: S.clientId,
            code_verifier: pending.verifier,
        }).then(function (res) {
            if (res.status !== 200) {
                step('Обмен кода не прошёл: ' + res.body.error, res.body.error_description || '', true);
                setState('Токены не выданы', 'is-bad');
                return;
            }
            step('Обменяли код на токены через /token (с code_verifier)',
                'выдан access token на ' + res.body.expires_in + ' с'
                + (res.body.refresh_token ? ', refresh token получен' : ', refresh token не выдан'));
            acceptTokens(res.body);
        });
    }

    function refresh() {
        if (!tokens || !tokens.refresh_token) return;
        postToken({
            grant_type: 'refresh_token',
            refresh_token: tokens.refresh_token,
            client_id: S.clientId,
        }).then(function (res) {
            if (res.status !== 200) {
                step('Обновить токен не вышло: ' + res.body.error, res.body.error_description || '', true);
                setState('Refresh не принят — нужен повторный вход', 'is-bad');
                return;
            }
            step('Обновили токены по refresh_token', 'новый access token живёт ' + res.body.expires_in + ' с');
            acceptTokens(res.body);
        });
    }

    function logout() {
        if (!tokens || !tokens.refresh_token) return;
        fetch('/token/revocation', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: form({
                token: tokens.refresh_token,
                token_type_hint: 'refresh_token',
                client_id: S.clientId,
            }),
        }).then(function (res) {
            step('Отозвали refresh_token (ответ ' + res.status + ') — обновить сессию больше нечем',
                'access token догорит сам в пределах своего TTL');
            tokens = null;
            steps = steps.slice();
            saveSession({ steps: steps });
            if (ticker) clearInterval(ticker);
            el('clock').hidden = true;
            ['idRow', 'accessRow', 'userinfoRow', 'refreshRow'].forEach(function (id) { el(id).hidden = true; });
            renderTokens();
            setState('Вышли: refresh отозван');
        });
    }

    el('login').addEventListener('click', login);
    el('refresh').addEventListener('click', refresh);
    el('logout').addEventListener('click', logout);

    var restored = loadSession();
    if (restored && restored.steps) {
        steps = restored.steps;
        renderSteps();
    }

    var params = new URLSearchParams(location.search);
    if (params.get('code') || params.get('error')) {
        handleCallback(params);
    } else {
        var saved = loadSession();
        if (saved && saved.tokens) {
            tokens = saved.tokens;
            step('Токены взяты из сессии вкладки — можно обновить или выйти');
            renderTokens();
            loadUserinfo();
        } else {
            renderTokens();
        }
    }
}());
