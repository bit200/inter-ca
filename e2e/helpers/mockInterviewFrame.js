// Мок реального itk-live для e2e mock-интервью. Идея: не трогать внешний сервис
// вообще — перехватываем и наш /embed-session, и сам домен interview.infrastruct.ru,
// подсовываем крошечную HTML-страницу, которая по скрипту шлёт postMessage-события
// в родителя (контракт: docs/contracts/embed-interview-iframe.md в репо itk-live,
// он же реализован в admin/src/comps/MockInterview/components/MockInterviewIframe.js).
//
// events: [{ delayMs, type, payload }] — что и когда отправить со стороны "iframe".
// type — один из 'itk.interview.ready' | 'itk.interview.error' | 'itk.interview.session_closed'
// (см. MockInterviewIframe.js — там же список полей payload на каждый тип).

const EMBED_ORIGIN = 'https://interview.infrastruct.ru';

function fakeEmbedPageHtml(events) {
  const script = `
    (function () {
      var events = ${JSON.stringify(events)};
      events.forEach(function (e) {
        setTimeout(function () {
          window.parent.postMessage({ source: 'itk-live-embed', type: e.type, payload: e.payload || {} }, '*');
        }, e.delayMs || 0);
      });
    })();
  `;
  return `<!doctype html><html><body style="background:#000"><script>${script}</script></body></html>`;
}

// mockItem — то, что должен вернуть GET /api/mock-interview/my-list/:id (минимум
// нужные MockInterview.js поля: interviewId, status, mode, name, _id)
async function mockInterviewBackend(page, { mockItem, events, reserveFails = false }) {
  const id = mockItem._id;

  await page.route(`**/api/mock-interview/my-list/${id}`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: mockItem });
    }
    // PUT (сохранение sessionId/status) — просто подтверждаем
    return route.fulfill({ json: { ok: true } });
  });

  await page.route(`**/api/mock-interview/my-list/${id}/reserve`, (route) => {
    if (reserveFails) {
      return route.fulfill({ status: 409, json: { error: 'busy' } });
    }
    return route.fulfill({ json: { ok: true } });
  });

  await page.route(`**/api/mock-interview/my-list/${id}/release`, (route) => route.fulfill({ json: { ok: true } }));

  await page.route(`**/api/mock-interview/my-list/${id}/embed-session`, (route) =>
    route.fulfill({
      json: {
        sessionId: 'e2e-fake-session',
        embedUrl: `${EMBED_ORIGIN}/embed/interview?launch_code=e2e-fake`,
      },
    })
  );

  await page.route(`${EMBED_ORIGIN}/**`, (route) =>
    route.fulfill({ contentType: 'text/html', body: fakeEmbedPageHtml(events || []) })
  );
}

module.exports = { mockInterviewBackend, EMBED_ORIGIN };
