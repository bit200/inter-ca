import {hasVideoLink, linkPipelineStep, linkPipelineView, shouldStartFromLink} from './videoLinkPipeline';

describe('разбор записи, вписанной ссылкой', () => {
    let link = 'https://drive.google.com/file/d/1uWWcZQ5Dr2oewniR-8/view';

    it('ссылка на запись - любая непустая строка, пробелы ссылкой не считаются', () => {
        expect(hasVideoLink(link)).toBe(true);
        expect(hasVideoLink('   ')).toBe(false);
        expect(hasVideoLink(null)).toBe(false);
    });

    it('вписанную ссылку без разбора отправляем в очередь сами', () => {
        expect(shouldStartFromLink({videoLink: link, status: '', loaded: true})).toBe(true);
    });

    it('без ссылки, до ответа api и на уже идущем разборе ничего не запускаем', () => {
        expect(shouldStartFromLink({videoLink: '', status: '', loaded: true})).toBe(false);
        expect(shouldStartFromLink({videoLink: link, status: '', loaded: false})).toBe(false);
        expect(shouldStartFromLink({videoLink: link, status: 'analyzing', loaded: true})).toBe(false);
        expect(shouldStartFromLink({videoLink: link, status: 'done', loaded: true})).toBe(false);
    });

    it('запуск по ссылке один: ошибку и повтор сами не перезапускаем', () => {
        expect(shouldStartFromLink({videoLink: link, status: 'error', loaded: true})).toBe(false);
        expect(shouldStartFromLink({videoLink: link, status: '', loaded: true, attempted: true})).toBe(false);
        expect(shouldStartFromLink({videoLink: link, status: '', loaded: true, sending: true})).toBe(false);
    });

    it('пока статуса нет, человек видит, что запись уходит на разбор, а не пустоту', () => {
        let view = linkPipelineView({videoLink: link, status: ''});
        expect(view.tone).toBe('work');
        expect(view.title).toMatch(/разбор/i);
    });

    it('каждый шаг очереди назван своими словами', () => {
        expect(linkPipelineView({videoLink: link, status: 'queued'}).title).toMatch(/очеред/i);
        expect(linkPipelineView({videoLink: link, status: 'downloading'}).title).toMatch(/скачива/i);
        expect(linkPipelineView({videoLink: link, status: 'analyzing'}).title).toMatch(/разбира/i);
        expect(linkPipelineView({videoLink: link, status: 'done'}).tone).toBe('done');
    });

    it('сбой показывает причину и куда смотреть дальше', () => {
        let view = linkPipelineView({videoLink: link, status: 'error', message: 'Нет доступа к файлу.'});
        expect(view.tone).toBe('error');
        expect(view.hint).toContain('Нет доступа к файлу.');
        expect(view.hint).toMatch(/по ссылке/i);
    });

    it('без ссылки блока состояния нет вовсе', () => {
        expect(linkPipelineView({videoLink: '', status: 'analyzing'})).toBe(null);
    });

    it('дорожка шагов до подтверждения статуса стоит на очереди', () => {
        expect(linkPipelineStep('')).toBe('queued');
        expect(linkPipelineStep('downloading')).toBe('downloading');
        expect(linkPipelineStep('error')).toBe('queued');
    });
});
