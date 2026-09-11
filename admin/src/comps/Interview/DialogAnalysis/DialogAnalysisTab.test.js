import React from 'react';
import {render, screen, waitFor, act, fireEvent} from '@testing-library/react';
import DialogAnalysisTab from './DialogAnalysisTab';

const interview = (dialogAnalysis) => ({_id: 7, video: 'https://example.test/call.mp4', dialogAnalysis});

const setupHttp = (payload) => {
    const post = jest.fn(() => Promise.resolve({status: 'queued'}));
    global.http = {
        get: jest.fn(() => Promise.resolve(payload)),
        post,
        put: jest.fn(() => Promise.resolve({})),
    };
    return post;
};

const flush = async () => { await act(async () => { await Promise.resolve(); }); };

beforeEach(() => { global.t = (key) => key; });

describe('таб разбора диалога', () => {
    test('без разбора зовёт оценить и ставит запись в очередь', async () => {
        const post = setupHttp(null);
        render(<DialogAnalysisTab item={interview(null)}/>);
        await flush();

        const button = screen.getByRole('button', {name: /Оценить/});
        expect(button).not.toBeDisabled();

        fireEvent.click(button);
        await waitFor(() => expect(post).toHaveBeenCalledWith('/my-interview/7/dialog-analysis', {}));
        await waitFor(() => expect(screen.getByText('В очереди')).toBeInTheDocument());
    });

    test('пока идёт обработка, кнопка заблокирована', async () => {
        setupHttp({status: 'analyzing'});
        render(<DialogAnalysisTab item={interview({status: 'analyzing'})}/>);
        await flush();

        expect(screen.getByRole('button', {name: /Оценить/})).toBeDisabled();
        expect(screen.getByText('Разбираем диалог')).toBeInTheDocument();
    });

    test('терминальная неретраебл-ошибка возвращает кнопку и показывает причину', async () => {
        setupHttp({status: 'error', error: {message: 'Доступ к файлу закрыт'}});
        render(<DialogAnalysisTab item={interview(null)}/>);
        await flush();

        expect(screen.getByText('Доступ к файлу закрыт')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /Оценить заново/})).not.toBeDisabled();
    });

    test('при готовом разборе кнопки нет, а реплики показаны', async () => {
        setupHttp({
            status: 'done',
            result: {
                conversation: {
                    summary: {durationMs: 125000},
                    markers: [{id: 'm1', category: 'filler', matchedPhrase: 'ну'}],
                    turns: [
                        {id: 't1', role: 'manager', startMs: 0, endMs: 4000, text: 'Расскажите о себе'},
                        {id: 't2', role: 'client', startMs: 5000, endMs: 9000, text: 'Ну, я пишу на js', markerIds: ['m1']},
                    ],
                },
            },
        });
        render(<DialogAnalysisTab item={interview(null)}/>);
        await flush();

        expect(screen.queryByRole('button', {name: /Оценить/})).toBeNull();
        expect(screen.getByText('Расскажите о себе')).toBeInTheDocument();
        expect(screen.getByText('Интервьюер')).toBeInTheDocument();
        expect(screen.getByText('Кандидат')).toBeInTheDocument();
        expect(screen.getByText('2:05')).toBeInTheDocument();
        expect(screen.getByText('Слово-паразит · 1')).toBeInTheDocument();
    });

    test('клик по реплике раскрывает её детализацию', async () => {
        setupHttp({
            status: 'done',
            result: {
                conversation: {
                    summary: {},
                    markers: [],
                    turns: [{
                        id: 't1',
                        role: 'client',
                        startMs: 1000,
                        endMs: 6000,
                        text: 'Работал с очередями',
                        signals: {prosody: {wordsPerMinute: 142}},
                    }],
                },
            },
        });
        render(<DialogAnalysisTab item={interview(null)}/>);
        await flush();

        fireEvent.click(screen.getByText('Работал с очередями'));
        expect(screen.getByText('142 слов/мин')).toBeInTheDocument();
    });
});
