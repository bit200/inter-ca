import React from 'react';
import {render, screen, waitFor, act, fireEvent, within} from '@testing-library/react';
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
    describe('реплики привязаны к записи', () => {
        const done = {
            status: 'done',
            result: {
                conversation: {
                    summary: {},
                    markers: [],
                    turns: [
                        {id: 't1', role: 'manager', startMs: 0, endMs: 4000, text: 'Расскажите о себе'},
                        {id: 't2', role: 'client', startMs: 65000, endMs: 70000, text: 'Работал с очередями', signals: {prosody: {wordsPerMinute: 142}}},
                    ],
                },
            },
        };

        test('кнопка у реплики перематывает видео на её начало и не раскрывает детали', async () => {
            setupHttp(done);
            const {container} = render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            const video = container.querySelector('video');
            expect(video).toHaveAttribute('src', 'https://example.test/call.mp4');
            video.play = jest.fn(() => Promise.resolve());

            fireEvent.click(screen.getByRole('button', {name: 'Воспроизвести с 1:05'}));
            expect(video.currentTime).toBe(65);
            expect(video.play).toHaveBeenCalled();
            expect(screen.queryByText('142 слов/мин')).toBeNull();
        });

        test('звучащая реплика подсвечивается по ходу записи', async () => {
            setupHttp(done);
            const {container} = render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            const video = container.querySelector('video');
            video.currentTime = 66;
            fireEvent.timeUpdate(video);
            const playing = container.querySelectorAll('[data-playing="true"]');
            expect(playing).toHaveLength(1);
            expect(playing[0]).toHaveTextContent('Работал с очередями');
        });

        test('у звучащей реплики вместо ▶ кнопка паузы, она останавливает запись', async () => {
            setupHttp(done);
            const {container} = render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            const video = container.querySelector('video');
            video.pause = jest.fn();
            video.currentTime = 66;
            fireEvent.timeUpdate(video);
            fireEvent.play(video);

            const pauseButton = screen.getByRole('button', {name: 'Пауза'});
            expect(pauseButton).toHaveTextContent('❚❚');
            expect(screen.getByRole('button', {name: 'Воспроизвести с 0:00'})).toHaveTextContent('▶');

            fireEvent.click(pauseButton);
            expect(video.pause).toHaveBeenCalled();
            fireEvent.pause(video);
            expect(screen.queryByRole('button', {name: 'Пауза'})).toBeNull();
            expect(screen.getByRole('button', {name: 'Воспроизвести с 1:05'})).toBeInTheDocument();
        });

        test('без видео реплики привязываются к аудиозаписи', async () => {
            setupHttp(done);
            const {container} = render(<DialogAnalysisTab item={{_id: 7, audio: 'https://example.test/call.mp3'}}/>);
            await flush();

            expect(container.querySelector('video')).toBeNull();
            expect(container.querySelector('audio')).toHaveAttribute('src', 'https://example.test/call.mp3');
            expect(screen.getAllByRole('button', {name: /Воспроизвести с/})).toHaveLength(2);
        });

        test('без записи кнопок воспроизведения нет', async () => {
            setupHttp(done);
            render(<DialogAnalysisTab item={{_id: 7}}/>);
            await flush();

            expect(screen.getByText('Расскажите о себе')).toBeInTheDocument();
            expect(screen.queryByRole('button', {name: /Воспроизвести с/})).toBeNull();
        });
    });

    test('роль говорящего можно назначить руками, когда интервьюеров несколько', async () => {
        setupHttp({
            status: 'done',
            result: {
                conversation: {
                    summary: {},
                    markers: [],
                    turns: [
                        {id: 't1', speaker: 'SPEAKER_00', role: 'manager', startMs: 0, endMs: 3000, text: 'Добрый день, начнём'},
                        {id: 't2', speaker: 'SPEAKER_01', role: 'unknown', startMs: 3000, endMs: 5000, text: 'Я второй интервьюер'},
                        {id: 't3', speaker: 'SPEAKER_02', role: 'unknown', startMs: 5000, endMs: 9000, text: 'Я пишу на js'},
                    ],
                },
            },
        });
        const onSpeakerRolesChange = jest.fn();
        render(<DialogAnalysisTab item={interview(null)} onSpeakerRolesChange={onSpeakerRolesChange}/>);
        await flush();

        expect(screen.getByText('Кто на записи кандидат')).toBeInTheDocument();
        const groups = screen.getAllByRole('radiogroup');
        fireEvent.click(within(groups[1]).getByRole('radio', {name: 'Интервьюер'}));
        fireEvent.click(within(groups[2]).getByRole('radio', {name: 'Кандидат'}));

        expect(onSpeakerRolesChange).toHaveBeenLastCalledWith({SPEAKER_01: 'manager', SPEAKER_02: 'client'});
        expect(within(groups[2]).getByRole('radio', {name: 'Кандидат'})).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('Добрый день, начнём').closest('[data-role]')).toHaveTextContent('Интервьюер 1');
        expect(screen.getByText('Я второй интервьюер').closest('[data-role]')).toHaveTextContent('Интервьюер 2');
        expect(screen.getByText('Я пишу на js').closest('[data-role]')).toHaveAttribute('data-role', 'client');
    });

    test('сохранённые роли применяются к ленте сразу', async () => {
        setupHttp({
            status: 'done',
            result: {conversation: {turns: [
                {id: 't1', speaker: 'SPEAKER_00', role: 'client', startMs: 0, endMs: 1000, text: 'Первый голос'},
                {id: 't2', speaker: 'SPEAKER_01', role: 'manager', startMs: 1000, endMs: 2000, text: 'Второй голос'},
            ]}},
        });
        render(<DialogAnalysisTab item={interview(null)} speakerRoles={{SPEAKER_00: 'manager', SPEAKER_01: 'client'}}/>);
        await flush();

        const first = screen.getByText('Первый голос').closest('[data-role]');
        expect(first.getAttribute('data-role')).toBe('manager');
        expect(screen.getByText('Второй голос').closest('[data-role]').getAttribute('data-role')).toBe('client');
    });
});
