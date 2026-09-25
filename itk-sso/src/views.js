'use strict';

/**
 * Экраны входа и согласия. Рисуем сами, без шаблонизатора и внешних ресурсов:
 * страница логина должна открываться, даже когда у сервиса нет ничего, кроме себя.
 */
function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[ch]);
}

const STYLE = `
:root{
  --paper:#f7f8fa; --ink:#121821; --muted:#616c7c; --hairline:#e2e6ec;
  --accent:#1f4fd8; --alert:#a32218; --alert-bg:#fbeceb; --field:#ffffff;
}
@media (prefers-color-scheme: dark){
  :root{
    --paper:#0f141b; --ink:#eef1f5; --muted:#97a1ae; --hairline:#222b36;
    --accent:#7ea2ff; --alert:#ff9a90; --alert-bg:#2a1817; --field:#141b24;
  }
}
*{box-sizing:border-box}
body{
  margin:0; min-height:100vh; background:var(--paper); color:var(--ink);
  font:15px/1.5 "Inter","Segoe UI",system-ui,-apple-system,sans-serif;
  display:flex; align-items:center; justify-content:center; padding:32px 20px;
}
main{width:100%; max-width:360px}
.mark{font-size:22px; font-weight:650; letter-spacing:.34em; margin:0 0 14px}
.rule{height:1px; background:var(--hairline); margin:0 0 18px}
h1{font-size:22px; line-height:1.25; font-weight:600; margin:0 0 6px; letter-spacing:-.01em}
.lede{color:var(--muted); font-size:13px; margin:0 0 24px}
.lede b{font-weight:600; color:var(--ink)}
label{display:block; margin:0 0 18px}
label span{display:block; font-size:13px; color:var(--muted); margin:0 0 6px}
input{
  width:100%; padding:8px 2px; font:inherit; color:var(--ink); background:var(--field);
  background:transparent; border:0; border-bottom:1px solid var(--hairline); border-radius:0;
}
input:focus{outline:none; border-bottom-color:var(--accent); box-shadow:0 1px 0 var(--accent)}
button{
  font:inherit; font-weight:550; cursor:pointer; padding:10px 18px; border-radius:2px;
  border:1px solid var(--accent); background:var(--accent); color:#fff;
}
button:focus-visible,a:focus-visible{outline:2px solid var(--accent); outline-offset:2px}
button.ghost{background:transparent; color:var(--ink); border-color:var(--hairline)}
.actions{display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:26px}
.alert{
  background:var(--alert-bg); color:var(--alert); border:0; border-left:2px solid var(--alert);
  border-radius:0; padding:10px 12px; font-size:13px; margin:0 0 6px;
}
.hint{color:var(--muted); font-size:12px; margin:0 0 20px; padding-left:14px}
ul.scopes{list-style:none; margin:0 0 4px; padding:0}
ul.scopes li{padding:9px 0; border-top:1px solid var(--hairline); font-size:14px}
ul.scopes li small{display:block; color:var(--muted); font-size:12px; margin-top:2px}
.owner{font-size:13px; color:var(--muted); margin:-12px 0 20px}
footer{margin-top:28px; color:var(--muted); font-size:12px}
form{margin:0}
`;

function page(title, body) {
    return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head><body><main>${body}</main></body></html>`;
}

/** Куда человек попадёт после входа — имя клиента говорит об этом прямо. */
function clientLabel(client) {
    if (!client) return 'внешнее приложение';
    return client.clientName || client.client_name || client.clientId || client.client_id;
}

function renderLogin({ uid, client, error, hint = '', login = '' }) {
    const name = esc(clientLabel(client));
    const alert = error
        ? `<p class="alert">${esc(error)}</p>`
        : '';
    // Подсказка идёт сразу под ошибкой: она объясняет не сбой, а что делать дальше.
    const note = error && hint ? `<p class="hint">${esc(hint)}</p>` : '';

    return page('Вход через ITK', `
<p class="mark">ITK</p>
<div class="rule"></div>
<h1>Вход через ITK</h1>
<p class="lede">После входа вы вернётесь в <b>${name}</b>. Логин и пароль — те же, что на портале ITK.</p>
${alert}${note}
<form method="post" action="/interaction/${esc(uid)}/login" autocomplete="on">
  <label><span>Логин или почта</span><input name="login" value="${esc(login)}" autocomplete="username" autofocus required></label>
  <label><span>Пароль</span><input name="password" type="password" autocomplete="current-password" required></label>
  <div class="actions"><button type="submit">Войти</button></div>
</form>
<footer>Данные проверяет портал ITK. itk-sso пароли не хранит.</footer>
`);
}

const SCOPE_TEXT = {
    openid: ['Кто вы', 'Идентификатор вашей учётной записи ITK'],
    profile: ['Имя профиля', 'Как вас зовут и под каким логином вы входите'],
    email: ['Почта', 'Адрес, указанный в профиле ITK'],
    roles: ['Роли', 'Права, выданные вам на платформе ITK'],
    offline_access: ['Длительный доступ', 'Приложение сможет обновлять доступ, пока вы не выйдете'],
    'mesh:read': ['Мок-интервью', 'Список ваших мок-интервью, записи и разборы'],
    'mesh:write': ['Изменение мок-интервью', 'Приложение сможет назначать и переносить ваши мок-интервью'],
    'evaluate:run': ['Оценки', 'Оценки ваших ответов и запуск новых оценок'],
    'profile:read': ['Профиль на платформе', 'Данные профиля ITK: опыт, навыки, статус'],
};

// Что именно просят — одной фразой в заголовке: «к вашим мок-интервью и оценкам».
const SCOPE_SUBJECT = {
    'mesh:read': 'мок-интервью',
    'mesh:write': 'мок-интервью',
    'evaluate:run': 'оценкам',
    'profile:read': 'данным профиля',
};

function accessSubject(scopes) {
    const nouns = [...new Set(scopes.map((s) => SCOPE_SUBJECT[s]).filter(Boolean))];
    if (!nouns.length) return '';
    const tail = nouns.length > 1 ? `${nouns.slice(0, -1).join(', ')} и ${nouns[nouns.length - 1]}` : nouns[0];
    return ` к вашим ${tail}`;
}

function renderConsent({ uid, client, scopes = [], accountName = '', owner = '', contact = '' }) {
    const name = esc(clientLabel(client));
    const items = scopes.map((scope) => {
        const [title, hint] = SCOPE_TEXT[scope] || [scope, 'Доступ, запрошенный приложением'];
        return `<li>${esc(title)}<small>${esc(hint)}</small></li>`;
    }).join('');

    return page('Доступ для приложения', `
<p class="mark">ITK</p>
<div class="rule"></div>
<h1>${name} запрашивает доступ${esc(accessSubject(scopes))}</h1>
<p class="lede">${accountName ? `Вы вошли как <b>${esc(accountName)}</b>. ` : ''}Приложение получит только то, что перечислено ниже.</p>
${owner || contact ? `<p class="owner">Это сторонняя система, её ведёт ${esc(owner || 'внешняя команда')}${contact ? ` (${esc(contact)})` : ''}. ITK за неё не отвечает.</p>` : ''}
<ul class="scopes">${items}</ul>
<form method="post" action="/interaction/${esc(uid)}/confirm">
  <div class="actions">
    <button type="submit">Разрешить</button>
    <button type="submit" class="ghost" formaction="/interaction/${esc(uid)}/abort">Отменить</button>
  </div>
</form>
<footer>Отозвать доступ можно в профиле ITK в любой момент.</footer>
`);
}

module.exports = { renderLogin, renderConsent, page, esc, clientLabel, accessSubject };
