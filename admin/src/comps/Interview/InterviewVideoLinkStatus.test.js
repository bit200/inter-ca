import React from 'react';
import {render, screen, act, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import InterviewVideoLinkStatus from './InterviewVideoLinkStatus';

const LINK = 'https://drive.google.com/file/d/1uWWcZQ5Dr2oewniR-8/view';

const setupHttp = (payload) => {
    const post = jest.fn(() => Promise.resolve({status: 'queued'}));
    global.http = {get: jest.fn(() => Promise.resolve(payload)), post};
    return post;
};

const show = (props) => render(
    <MemoryRouter><InterviewVideoLinkStatus interviewId={7} videoLink={LINK} {...props}/></MemoryRouter>
);

const flush = async () => { await act(async () => { await Promise.resolve(); }); };

describe('состояние разбора записи, вписанной ссылкой', () => {
    test('вписанная ссылка сама уходит на разбор, и человек видит очередь', async () => {
        const post = setupHttp(null);
        show();
        await flush();

        await waitFor(() => expect(post).toHaveBeenCalledWith('/my-interview/7/dialog-analysis', {}, {wo_notify: true}));
        await waitFor(() => expect(screen.getByText('Запись в очереди на разбор')).toBeInTheDocument());
    });

    test('идущий разбор показывает текущий шаг и не запускается повторно', async () => {
        const post = setupHttp({status: 'downloading'});
        show();
        await flush();

        expect(post).not.toHaveBeenCalled();
        expect(screen.getByText('Скачиваем запись по ссылке')).toBeInTheDocument();
        expect(screen.getByText('Скачиваем запись')).toBeInTheDocument();
    });

    test('сбой очереди объясняет причину', async () => {
        setupHttp({status: 'error', error: {message: 'Доступ к файлу закрыт.'}});
        show();
        await flush();

        expect(screen.getByText('Не удалось забрать запись по ссылке')).toBeInTheDocument();
        expect(screen.getByText(/Доступ к файлу закрыт\./)).toBeInTheDocument();
    });

    test('без ссылки блока нет', async () => {
        const post = setupHttp(null);
        const {container} = show({videoLink: ''});
        await flush();

        expect(container).toBeEmptyDOMElement();
        expect(post).not.toHaveBeenCalled();
    });
});
