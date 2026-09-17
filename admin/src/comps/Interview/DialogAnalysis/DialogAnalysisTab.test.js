import React from 'react';
import {render, screen, waitFor, act, fireEvent, within} from '@testing-library/react';
import DialogAnalysisTab from './DialogAnalysisTab';

const interview = (dialogAnalysis) => ({_id: 7, video: 'https://example.test/call.mp4', dialogAnalysis});

// answers - ответ ручки оценки ответов; у разбора и оценки разные адреса.
const setupHttp = (payload, answers = null) => {
    const post = jest.fn(() => Promise.resolve({status: 'queued'}));
    global.http = {
        get: jest.fn(url => Promise.resolve(/answers-evaluation/.test(url) ? answers : payload)),
        post,
        put: jest.fn(() => Promise.resolve({})),
    };
    return post;
};

const flush = async () => { await act(async () => { await Promise.resolve(); }); };

// Блоки вопросов изначально свёрнуты - раскрываем по шапке, чтобы добраться до реплик.
const expand = (region) => {
    const toggle = within(region).getAllByRole('button').find(node => node.hasAttribute('aria-controls'));
    if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle);
    return region;
};

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

        expect(screen.queryByRole('button', {name: /^Оценить( заново)?$/})).toBeNull();
        expect(screen.getByText('Расскажите о себе')).toBeInTheDocument();
        // Роль - у реплики и подписью дорожки «Хода разговора», как в карточке звонка.
        expect(screen.getAllByText('Интервьюер')).toHaveLength(2);
        expect(screen.getAllByText('Кандидат')).toHaveLength(2);
        expect(screen.getByRole('group', {name: 'Реплики: Кандидат'}).children).toHaveLength(1);
        // Длительность - в сведениях и концом шкалы.
        expect(screen.getAllByText('2:05')).toHaveLength(2);
    });

    test('замечания по видам - попапом по клику на их число, и только по речи кандидата', async () => {
        setupHttp({
            status: 'done',
            result: {
                conversation: {
                    summary: {durationMs: 125000},
                    markers: [
                        {id: 'm1', category: 'filler', matchedPhrase: 'ну'},
                        {id: 'm2', category: 'filler', matchedPhrase: 'как бы'},
                        {id: 'm3', category: 'uncertainty', matchedPhrase: 'наверное'},
                        {id: 'm4', category: 'filler', matchedPhrase: 'короче'},
                        {id: 'm5', category: 'hedging', matchedPhrase: 'в принципе'},
                    ],
                    turns: [
                        {id: 't1', role: 'manager', startMs: 0, endMs: 4000, text: 'Короче, в принципе расскажите о себе', markerIds: ['m4', 'm5']},
                        {id: 't2', role: 'client', startMs: 5000, endMs: 9000, text: 'Ну, как бы, наверное', markerIds: ['m1', 'm2', 'm3']},
                    ],
                },
            },
        });
        render(<DialogAnalysisTab item={interview(null)}/>);
        await flush();

        expect(screen.queryByText('Слово-паразит · 2')).toBeNull();
        expect(screen.queryByRole('dialog', {name: 'Замечания по видам'})).toBeNull();

        const count = screen.getByRole('button', {name: /Замечания: 3/});
        fireEvent.click(count);
        const popover = screen.getByRole('dialog', {name: 'Замечания по видам'});
        const rows = within(popover).getAllByRole('listitem').map(row => row.textContent);
        expect(rows).toEqual(['Слово-паразит2', 'Неуверенность1']);

        fireEvent.keyDown(document, {key: 'Escape'});
        expect(screen.queryByRole('dialog', {name: 'Замечания по видам'})).toBeNull();
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
            const audio = container.querySelector('audio');
            expect(audio).toHaveAttribute('src', 'https://example.test/call.mp3');
            // Аудио играет в фирменном плеере проекта, а не в стандартном браузерном
            expect(audio).not.toHaveAttribute('controls');
            expect(audio.closest('.call-player')).not.toBeNull();
            expect(screen.getByRole('button', {name: 'Слушать запись'})).toBeInTheDocument();
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

    test('роль говорящего назначается в попапе над репликой, когда интервьюеров несколько', async () => {
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

        expect(screen.queryByText('Кто на записи кандидат')).toBeNull();
        expect(screen.queryByRole('radiogroup', {name: 'Роль говорящего'})).toBeNull();

        const turnOf = text => screen.getByText(text).closest('[data-role]');
        const pick = (text, role) => {
            fireEvent.click(within(turnOf(text)).getByRole('button', {expanded: false}));
            const popover = within(turnOf(text)).getByRole('radiogroup');
            fireEvent.click(within(popover).getByRole('radio', {name: role}));
        };

        pick('Я второй интервьюер', 'Интервьюер');
        expect(screen.queryByRole('radiogroup', {name: 'Роль говорящего'})).toBeNull();
        pick('Я пишу на js', 'Кандидат');

        expect(onSpeakerRolesChange).toHaveBeenLastCalledWith({SPEAKER_01: 'manager', SPEAKER_02: 'client'});
        expect(screen.queryByText('142 слов/мин')).toBeNull();
        fireEvent.click(within(turnOf('Я пишу на js')).getByRole('button', {expanded: false}));
        expect(within(turnOf('Я пишу на js')).getByRole('radio', {name: 'Кандидат'})).toHaveAttribute('aria-checked', 'true');
        fireEvent.keyDown(within(turnOf('Я пишу на js')).getByRole('radio', {name: 'Кандидат'}), {key: 'Escape'});
        expect(screen.queryByRole('radiogroup', {name: 'Роль говорящего'})).toBeNull();
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

    describe('пересчёт оценки после ручных ролей', () => {
        const unassigned = {
            status: 'done',
            result: {conversation: {turns: [
                {id: 't1', speaker: 'SPEAKER_00', role: 'unknown', startMs: 0, endMs: 1000, text: 'Первый голос'},
                {id: 't2', speaker: 'SPEAKER_01', role: 'unknown', startMs: 1000, endMs: 2000, text: 'Второй голос'},
            ]}},
        };
        const answersDone = {answersEvaluation: {status: 'done', result: {}}};
        const pick = async (text, label) => {
            const turn = screen.getByText(text).closest('[data-role]');
            fireEvent.click(within(turn).getByTitle('Указать, кто это'));
            fireEvent.click(screen.getByRole('radio', {name: label}));
            await flush();
        };
        const evaluations = post => post.mock.calls.filter(([url]) => /answers-evaluation/.test(url)).length;

        const roleSends = post => post.mock.calls.filter(([url]) => /speaker-roles/.test(url));

        test('когда заполнены обе роли, они один раз уходят на бэк — он и продолжает оценку', async () => {
            const post = setupHttp(unassigned, answersDone);
            const onChange = jest.fn();
            render(<DialogAnalysisTab item={interview(null)} onSpeakerRolesChange={onChange}/>);
            await flush();

            await pick('Первый голос', 'Интервьюер');
            expect(roleSends(post)).toHaveLength(0);

            await pick('Второй голос', 'Кандидат');
            await waitFor(() => expect(post).toHaveBeenCalledWith('/my-interview/7/speaker-roles', {roles: {SPEAKER_00: 'manager', SPEAKER_01: 'client'}}));
            expect(roleSends(post)).toHaveLength(1);
            expect(evaluations(post)).toBe(0);
            expect(onChange).toHaveBeenLastCalledWith({SPEAKER_00: 'manager', SPEAKER_01: 'client'});
        });

        test('роли не определились автоматически — уведомление просит отметить их и продолжает оценку', async () => {
            const post = setupHttp({...unassigned, rolesPending: true}, {answersEvaluation: {status: ''}});
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            const notice = screen.getByTestId('roles-pending-notice');
            expect(within(notice).getByText('Отметьте, кто интервьюер, а кто кандидат')).toBeInTheDocument();
            const next = within(notice).getByRole('button', {name: 'Продолжить оценку'});
            expect(next).toBeDisabled();

            // У двух участников хватает одного выбора — второй становится кандидатом сам.
            const first = within(notice).getByText('Первый голос').closest('li');
            fireEvent.click(within(first).getByRole('button', {name: 'Интервьюер'}));
            const second = within(notice).getByText('Второй голос').closest('li');
            expect(within(second).getByRole('button', {name: 'Кандидат'})).toHaveAttribute('aria-pressed', 'true');

            fireEvent.click(next);
            await waitFor(() => expect(post).toHaveBeenCalledWith('/my-interview/7/speaker-roles', {roles: {SPEAKER_00: 'manager', SPEAKER_01: 'client'}}));
        });

        test('если обе роли уже были, смена роли оценку не перезапускает', async () => {
            const post = setupHttp(unassigned, answersDone);
            render(<DialogAnalysisTab item={interview(null)} speakerRoles={{SPEAKER_00: 'manager', SPEAKER_01: 'client'}}/>);
            await flush();

            await pick('Первый голос', 'Кандидат');
            expect(evaluations(post)).toBe(0);
        });
    });

    describe('оценка ответов по прошлому разбору записи', () => {
        const reanalyzed = {
            status: 'done',
            result: {analyzedAt: '2026-09-16T10:16:48.674Z', conversation: {turns: [
                {id: 't1', role: 'manager', startMs: 0, endMs: 3000, text: 'Что такое DRY?'},
                {id: 't2', role: 'client', startMs: 3000, endMs: 9000, text: 'DRY - это Don\'t Repeat Yourself'},
            ]}},
        };
        const evaluatedBy = analyzedAt => ({answersEvaluation: {status: 'done', result: {analyzedAt, blocks: [{
            question: 'Что такое DRY?', answer: 'Stride - это Don\'t Repeat Yourself', turnIds: ['t1', 't2'],
            technical: true, evaluate: {score: 1, maxScore: 10, feedback: 'Stride - не принцип программирования'},
        }]}}});
        const evaluations = post => post.mock.calls.filter(([url]) => /answers-evaluation/.test(url)).length;

        test('оценка по старому разбору не показывается и пересчитывается один раз', async () => {
            const post = setupHttp(reanalyzed, evaluatedBy('2026-09-14T11:41:40.579Z'));
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            await waitFor(() => expect(post).toHaveBeenCalledWith('/my-interview/7/answers-evaluation', {}));
            await flush();
            expect(evaluations(post)).toBe(1);
            expect(screen.queryByText('Stride - не принцип программирования')).toBeNull();
        });

        test('оценка по текущему разбору не перезапускается', async () => {
            const post = setupHttp(reanalyzed, evaluatedBy('2026-09-16T10:16:48.674Z'));
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();
            await flush();

            expect(evaluations(post)).toBe(0);
        });
    });

    describe('оценка ответов по вопросам', () => {
        const done = {
            status: 'done',
            result: {conversation: {turns: [
                {id: 't1', role: 'manager', startMs: 0, endMs: 3000, text: 'Что такое замыкание?'},
                {id: 't2', role: 'client', startMs: 3000, endMs: 9000, text: 'Функция с доступом к внешней области'},
                {id: 't3', role: 'manager', startMs: 9000, endMs: 11000, text: 'Почему ушли с прошлой работы?'},
                {id: 't4', role: 'client', startMs: 11000, endMs: 15000, text: 'Хотел расти'},
            ]}},
        };

        test('кнопки «Оценить ответы» нет, пока разбор диалога не готов', async () => {
            setupHttp({status: 'analyzing'});
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            expect(screen.queryByRole('button', {name: /Оценить ответы/})).toBeNull();
            expect(screen.queryByText('Оценка ответов')).toBeNull();
        });

        test('после разбора кнопка ставит оценку в очередь и блокируется на шагах оценки', async () => {
            const post = setupHttp(done);
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            const button = screen.getByRole('button', {name: 'Оценить ответы'});
            expect(button).not.toBeDisabled();
            fireEvent.click(button);
            await waitFor(() => expect(post).toHaveBeenCalledWith('/my-interview/7/answers-evaluation', {}));
            await waitFor(() => expect(screen.getByRole('button', {name: /Оценить ответы/})).toBeDisabled());
            await waitFor(() => expect(screen.getByText('Делим на вопросы')).toBeInTheDocument());
        });

        test('терминальная ошибка оценки показывает причину и возвращает кнопку', async () => {
            setupHttp(done, {answersEvaluation: {status: 'error', error: {message: 'Сервис оценки недоступен'}}});
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            expect(screen.getByText('Сервис оценки недоступен')).toBeInTheDocument();
            expect(screen.getByText('Оценка ответов остановлена')).toBeInTheDocument();
            expect(screen.getByRole('button', {name: 'Оценить ответы заново'})).not.toBeDisabled();
        });

        test('готовые разбор и оценка не показывают свои карточки с шагами, а идущие и упавшие показывают', async () => {
            setupHttp(done, {answersEvaluation: {status: 'done', result: {blocks: []}}});
            const {unmount} = render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            expect(screen.queryByText('Разбор диалога')).toBeNull();
            expect(screen.queryByText('Оценка ответов')).toBeNull();
            expect(screen.queryByText('Готово')).toBeNull();
            expect(screen.getByText('Что такое замыкание?')).toBeInTheDocument();
            unmount();

            setupHttp(done, {answersEvaluation: {status: 'evaluating'}});
            const second = render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();
            expect(screen.queryByText('Разбор диалога')).toBeNull();
            expect(screen.getByText('Оценка ответов')).toBeInTheDocument();
            expect(screen.getByText('Оцениваем ответы')).toBeInTheDocument();
            second.unmount();

            setupHttp({status: 'error', error: {message: 'Запись недоступна'}});
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();
            expect(screen.getByText('Разбор диалога')).toBeInTheDocument();
            expect(screen.getByText('Запись недоступна')).toBeInTheDocument();
        });

        test('реплики собраны в вопросы с меткой темы и баллом у технического', async () => {
            setupHttp(done, {answersEvaluation: {status: 'done', result: {blocks: [
                {id: 'b1', technical: true, turnIndexes: [0, 1], evaluation: {score: 8, feedback: 'Определение верное'}},
                {id: 'b2', technical: false, turnIndexes: [2, 3]},
            ]}}});
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            expect(screen.queryByRole('button', {name: /Оценить ответы/})).toBeNull();
            const first = expand(screen.getByRole('region', {name: 'Вопрос 1'}));
            expect(within(first).getByText('Технический')).toBeInTheDocument();
            // Текст вопроса - в шапке блока и в самой реплике интервьюера.
            expect(within(first).getAllByText('Что такое замыкание?')).toHaveLength(2);
            expect(within(first).getByRole('button', {name: 'Оценка 8 из 10, показать детализацию'})).toBeInTheDocument();
            expect(within(first).getByText('Определение верное')).toBeInTheDocument();

            const second = screen.getByRole('region', {name: 'Вопрос 2'});
            expect(within(second).getByText('Нетехнический')).toBeInTheDocument();
            expect(within(second).getByText('Не оцениваем')).toBeInTheDocument();
            expect(within(second).queryByRole('img')).toBeNull();

            fireEvent.click(screen.getByRole('button', {name: /^Диалог/}));
            expect(screen.queryByRole('region', {name: 'Вопрос 1'})).toBeNull();
            expect(screen.getByText('Хотел расти')).toBeInTheDocument();
        });

        test('по клику на балл технического вопроса попап раскладывает оценку на показатели и ведёт на страницу детализации', async () => {
            setupHttp(done, {answersEvaluation: {status: 'done', result: {blocks: [
                {id: 'b1', technical: true, turnIndexes: [0, 1], evaluate: {
                    score: 2.8,
                    evaluation: {
                        relevance: {relevance: 9},
                        depth: {depth_score: 2},
                        errors: {is_critical: 1, errors: ['Путает замыкание с классом']},
                    },
                }},
            ]}}});
            const reference = {
                '/eval-metric-schemas': {items: [
                    {key: 'evaluation.relevance.relevance', group: 'Релевантность', min: 0, max: 9},
                    {key: 'evaluation.depth.depth_score', group: 'Глубина', min: 0, max: 10},
                ]},
                '/eval-advice-rule': {items: [
                    {key: 'evaluation.depth.depth_score', from: 0, to: 4, advice: 'Раскройте, как это работает внутри'},
                ]},
            };
            const answersGet = global.http.get;
            global.http.get = jest.fn((url, ...rest) => reference[url] ? Promise.resolve(reference[url]) : answersGet(url, ...rest));
            require('./answerBrief').resetEvaluationReference();
            global.navigate = jest.fn();

            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            const block = screen.getByRole('region', {name: 'Вопрос 1'});
            const score = within(block).getByRole('button', {name: 'Оценка 2,8 из 10, показать детализацию'});
            expect(screen.queryByRole('dialog', {name: 'Детализация оценки'})).toBeNull();

            fireEvent.click(score);
            const popup = await screen.findByRole('dialog', {name: 'Детализация оценки'});
            expect(score).toHaveAttribute('aria-expanded', 'true');
            expect(within(popup).getByText('Ответ не засчитан')).toBeInTheDocument();
            await waitFor(() => expect(within(popup).getByText('Глубина')).toBeInTheDocument());
            expect(within(popup).getByText('20%')).toBeInTheDocument();
            expect(within(popup).getByText('Релевантность')).toBeInTheDocument();
            expect(within(popup).getByText('100%')).toBeInTheDocument();
            expect(within(popup).getByText('Путает замыкание с классом')).toBeInTheDocument();
            expect(within(popup).getByText('Раскройте, как это работает внутри')).toBeInTheDocument();

            const link = within(popup).getByRole('link', {name: 'Открыть полный разбор ответа'});
            expect(link).toHaveAttribute('href', '/interviews/7/answers/1');
            fireEvent.click(link);
            expect(global.navigate).toHaveBeenCalledWith('/interviews/7/answers/1');

            fireEvent.keyDown(document, {key: 'Escape'});
            expect(screen.queryByRole('dialog', {name: 'Детализация оценки'})).toBeNull();
            delete global.navigate;
        });

        test('по клику на балл нетехнического вопроса попап показывает, из чего сложилась оценка', async () => {
            setupHttp(done, {answersEvaluation: {status: 'done', result: {blocks: [
                {id: 'b1', technical: false, turnIndexes: [0, 1], softEvaluate: {relevance: 'on_topic', complete: false, engaged: true, note: 'Ответил в двух словах'}},
            ]}}});
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            const block = screen.getByRole('region', {name: 'Вопрос 1'});
            fireEvent.click(within(block).getByRole('button', {name: 'Оценка 6 из 10, показать детализацию'}));
            const popup = screen.getByRole('dialog', {name: 'Детализация оценки'});
            expect(within(popup).getByText('Из чего сложилась оценка')).toBeInTheDocument();
            expect(within(popup).getByText('По теме')).toBeInTheDocument();
            expect(within(popup).getByText('Формально')).toBeInTheDocument();
            expect(within(popup).getByText('Встречные вопросы')).toBeInTheDocument();
            expect(within(popup).getByText('Сумма 7, но ответ формальный — балл ограничен 6.')).toBeInTheDocument();
            expect(within(popup).getByRole('region', {name: 'Содержание'})).toHaveTextContent('Содержание вес 70%6 из 10');
            const delivery = within(popup).getByRole('region', {name: 'Подача'});
            expect(delivery).toHaveTextContent('Подача вес 30%10 из 10');
            expect(within(delivery).getByText('Без слов-паразитов')).toBeInTheDocument();
            expect(within(popup).getByText('Ответил в двух словах')).toBeInTheDocument();
            expect(within(popup).queryByText('Загружаем показатели…')).toBeNull();

            fireEvent.keyDown(document, {key: 'Escape'});
            expect(screen.queryByRole('dialog', {name: 'Детализация оценки'})).toBeNull();
        });

        test('в шапке вопроса его текст вместо номера, по шапке вопрос сворачивается и разворачивается', async () => {
            setupHttp(done, {answersEvaluation: {status: 'done', result: {blocks: [
                {id: 'b1', technical: true, turnIndexes: [0, 1], evaluation: {score: 8, feedback: 'Определение верное'}},
            ]}}});
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            const block = screen.getByRole('region', {name: 'Вопрос 1'});
            expect(within(block).queryByText('Вопрос 1')).toBeNull();
            const toggle = within(block).getByRole('button', {name: 'Что такое замыкание?'});
            // Изначально вопрос свёрнут: видна только шапка с темой.
            expect(toggle).toHaveAttribute('aria-expanded', 'false');
            expect(within(block).queryByText('Функция с доступом к внешней области')).toBeNull();
            expect(within(block).queryByText('Определение верное')).toBeNull();
            expect(within(block).getByText('Технический')).toBeInTheDocument();

            fireEvent.click(toggle);
            expect(toggle).toHaveAttribute('aria-expanded', 'true');
            expect(within(block).getByText('Функция с доступом к внешней области')).toBeInTheDocument();

            fireEvent.click(toggle);
            expect(within(block).queryByText('Функция с доступом к внешней области')).toBeNull();
        });

        test('линзы: технический и нетехнический баллы, флаги и счётчики - из настоящей оценки ответов', async () => {
            setupHttp(done, {answersEvaluation: {status: 'done', result: {blocks: [
                {id: 'b1', technical: true, turnIndexes: [0, 1], evaluate: {score: 8}},
                {id: 'b2', technical: false, turnIndexes: [2, 3], softEvaluate: {relevance: 'off_topic', complete: false}},
            ]}}});
            const {container} = render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            expect(container.querySelector('[role="tooltip"]')).toBeNull();
            expect(screen.queryByText(/ДЕМО/)).toBeNull();
            const bar = screen.getByRole('region', {name: 'Оценка интервью'});
            expect(within(bar).getByText('Техническая').parentElement).toHaveTextContent('8/10');
            expect(within(bar).getByText('Нетехническая').parentElement).toHaveTextContent('0/1');
            expect(within(bar).getByText('Не по вопросу · 1')).toBeInTheDocument();
            expect(within(bar).getByText('Без ответа · 0')).toBeInTheDocument();
            expect(within(bar).queryByText(/Невежливо/)).toBeNull();

            // Блоки изначально свёрнуты - скобки видны в развёрнутых. Балла на
            // скобке нет: он уже стоит в шапке вопроса справа.
            const expand = () => ['Вопрос 1', 'Вопрос 2'].forEach(name => fireEvent.click(within(screen.getByRole('region', {name})).getByTitle('Развернуть вопрос')));
            expand();
            const brackets = () => Array.from(container.querySelectorAll('[data-bracket="done"]')).map(node => node.closest('section').getAttribute('aria-label'));
            expect(Array.from(container.querySelectorAll('[data-bracket="done"] > [class*="bracket"]')).map(node => node.textContent)).toEqual(['', '']);
            expect(brackets()).toEqual(['Вопрос 1', 'Вопрос 2']);
            const second = screen.getByRole('region', {name: 'Вопрос 2'});
            expect(within(second).getByRole('button', {name: 'Оценка 0 из 10, показать детализацию'})).toBeInTheDocument();
            expect(within(second).getByText('Не по вопросу')).toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', {name: /^Диалог/}));
            expect(Array.from(container.querySelectorAll('[class*="answerScore"]')).map(node => node.textContent)).toEqual(['8', '0']);
            expect(container.querySelectorAll('[class*="turnFlags"] [data-kind="off_topic"]').length).toBe(1);

            fireEvent.click(screen.getByRole('button', {name: /^Обзор/}));
            fireEvent.click(within(screen.getByRole('region', {name: 'Оценка интервью'})).getByRole('radio', {name: 'Техника'}));
            expect(screen.getByRole('region', {name: 'Вопрос 2'})).toHaveAttribute('data-dimmed', 'true');
            expect(screen.getByRole('region', {name: 'Вопрос 1'})).not.toHaveAttribute('data-dimmed');
            expand();
            expect(brackets()).toEqual(['Вопрос 1']);
            fireEvent.click(within(screen.getByRole('region', {name: 'Оценка интервью'})).getByRole('radio', {name: 'Поведение'}));
            expect(brackets()).toEqual(['Вопрос 2']);
        });

        test('без оценки ответов выдуманной разбивки на вопросы нет - только лента реплик', async () => {
            setupHttp(done, null);
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            expect(screen.queryByRole('region', {name: 'Оценка интервью'})).toBeNull();
            expect(screen.queryByRole('region', {name: 'Вопрос 1'})).toBeNull();
            expect(screen.queryByText(/ДЕМО/)).toBeNull();
            expect(screen.getByText('Хотел расти')).toBeInTheDocument();
        });

        test('вопрос без ответа связывается с репликой кандидата в два клика', async () => {
            setupHttp(done, {answersEvaluation: {status: 'done', result: {blocks: [
                {id: 'b1', technical: true, turnIndexes: [0]},
                {id: 'b2', technical: true, turnIndexes: [1, 2, 3]},
            ]}}});
            const onAnswerLinksChange = jest.fn();
            render(<DialogAnalysisTab item={interview(null)} onAnswerLinksChange={onAnswerLinksChange}/>);
            await flush();

            const first = () => screen.getByRole('region', {name: 'Вопрос 1'});
            expect(within(first()).getByText('Ответ не найден')).toBeInTheDocument();
            fireEvent.click(within(first()).getByRole('button', {name: 'Найти ответ'}));
            expect(screen.getByRole('status')).toHaveTextContent('Связываем ответ с вопросом 1');

            fireEvent.click(screen.getByText('Функция с доступом к внешней области'));
            expect(screen.queryByRole('status')).toBeNull();
            expect(within(first()).getByText('Функция с доступом к внешней области')).toBeInTheDocument();
            expect(within(first()).queryByText('Ответ не найден')).toBeNull();
            expect(onAnswerLinksChange).toHaveBeenCalledWith({b1: [1]});
        });

        test('сохранённая связь ответа применяется к ленте сразу', async () => {
            setupHttp(done, {answersEvaluation: {status: 'done', result: {blocks: [
                {id: 'b1', technical: true, turnIndexes: [0]},
                {id: 'b2', technical: true, turnIndexes: [1, 2, 3]},
            ]}}});
            render(<DialogAnalysisTab item={interview(null)} answerLinks={{b1: [1]}}/>);
            await flush();

            const first = expand(screen.getByRole('region', {name: 'Вопрос 1'}));
            expect(within(first).getByText('Функция с доступом к внешней области')).toBeInTheDocument();
            expect(within(first).queryByText('Ответ не найден')).toBeNull();
        });

        test('пока идёт оценка, у технического вопроса без балла написано «Оцениваем»', async () => {
            setupHttp(done, {answersEvaluation: {status: 'evaluating', blocks: [
                {id: 'b1', technical: true, turnIndexes: [0, 1]},
            ]}});
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            expect(within(screen.getByRole('region', {name: 'Вопрос 1'})).getByText('Оцениваем')).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /Оценить ответы/})).toBeDisabled();
        });
        test('итог интервью стоит над процессами: балл, сводка, приветствие с прощанием и цифры разговора', async () => {
            setupHttp(done, {answersEvaluation: {status: 'done', result: {
                blocks: [
                    {id: 'b1', technical: true, turnIndexes: [0, 1], evaluation: {score: 8}},
                    {id: 'b2', technical: false, turnIndexes: [2, 3], softEvaluate: {relevance: 'evasive', complete: false, note: 'Про причину ухода не сказал'}},
                ],
                greeting: {greeted: true, farewelled: false},
                metrics: {
                    speech: {managerPercent: 35, clientPercent: 65},
                    interruptions: {managerInterruptedClient: 1, clientInterruptedManager: 4},
                    blocks: [{responseDelayMs: 1500, answerDurationMs: 6000}],
                    responses: {responseDelayMs: {median: 1500}, answerDurationMs: {median: 42000}},
                },
                overall: {score: 6.5, summary: 'Технически уверен, на вопросы про мотивацию отвечает уклончиво.'},
            }}});
            const {container} = render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            const summary = screen.getByRole('region', {name: 'Итог интервью'});
            expect(container.querySelector('section').getAttribute('aria-label')).toBe('Итог интервью');
            expect(within(summary).getByRole('img', {name: /^Общая оценка [\d,]+ из 10: техническая 6,5, нетехническая [\d,]+ с весом 0,6$/})).toBeInTheDocument();
            expect(within(summary).getByText('техника')).toBeInTheDocument();
            expect(within(summary).getByText('общение')).toBeInTheDocument();
            expect(within(summary).queryByText(/×/)).not.toBeInTheDocument();
            expect(within(summary).getByText('Технически уверен, на вопросы про мотивацию отвечает уклончиво.')).toBeInTheDocument();
            expect(within(summary).getByText('Приветствие есть')).toBeInTheDocument();
            expect(within(summary).getByText('Прощания нет')).toBeInTheDocument();
            expect(within(summary).getByText('Кандидат 65%')).toBeInTheDocument();
            expect(within(within(summary).getByText('Перебивания').closest('div')).getByText('4')).toBeInTheDocument();
            expect(within(summary).getByText('42 с')).toBeInTheDocument();

            // Тайминги под вопросом не показываем: ни интервал, ни паузу перед ответом.
            const firstQuestion = screen.getByRole('region', {name: 'Вопрос 1'});
            expect(within(firstQuestion).queryByText(/пауза перед ответом|ответ начат до конца вопроса/)).toBeNull();
            expect(within(firstQuestion.querySelector('header')).queryByText(/\d+:\d{2}[–-]\d+:\d{2}/)).toBeNull();
            const second = expand(screen.getByRole('region', {name: 'Вопрос 2'}));
            expect(within(second).getByText('Уклончиво')).toBeInTheDocument();
            expect(within(second).getByText('Формально')).toBeInTheDocument();
            expect(within(second).getByText('Про причину ухода не сказал')).toBeInTheDocument();
            expect(within(second).queryByText('Не оцениваем')).toBeNull();
        });

        test('пока пишется итог, в блоке итога ожидание и шаг «Пишем итог»', async () => {
            setupHttp(done, {answersEvaluation: {status: 'summarizing', result: {blocks: [
                {id: 'b1', technical: false, turnIndexes: [0, 1], softEvaluate: {relevance: 'on_topic', complete: true}},
            ], metrics: {speech: {managerPercent: 50, clientPercent: 50}}}}});
            render(<DialogAnalysisTab item={interview(null)}/>);
            await flush();

            expect(screen.getByText('Пишем итог')).toBeInTheDocument();
            expect(screen.getByText('Пишем итог по оценкам ответов и метрикам разговора.')).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /Оценить ответы/})).toBeDisabled();
        });
    });
});

describe('скелетон таба разбора диалога', () => {
    test('пока разбор не пришёл, вместо шапки «Оценить» стоит скелетон', async () => {
        let resolve;
        global.http = {
            get: jest.fn(url => /dialog-analysis/.test(url) ? new Promise(done => { resolve = done; }) : Promise.resolve(null)),
            post: jest.fn(), put: jest.fn(),
        };
        render(<DialogAnalysisTab item={interview(null)}/>);

        expect(screen.getByTestId('dialog-skeleton')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /Оценить/})).toBeNull();

        await act(async () => { resolve(null); });
        await flush();
        expect(screen.queryByTestId('dialog-skeleton')).toBeNull();
        expect(screen.getByRole('button', {name: /Оценить/})).toBeInTheDocument();
    });

    test('готовый разбор ждёт оценку ответов, чтобы итог не сдвинул расшифровку', async () => {
        let resolveAnswers;
        global.http = {
            get: jest.fn(url => /answers-evaluation/.test(url)
                ? new Promise(done => { resolveAnswers = done; })
                : Promise.resolve({status: 'done', result: {conversation: {turns: [{id: 't1', role: 'manager', startMs: 0, endMs: 1000, text: 'Привет'}]}}})),
            post: jest.fn(), put: jest.fn(),
        };
        render(<DialogAnalysisTab item={interview(null)}/>);
        await flush();
        expect(screen.getByTestId('dialog-skeleton')).toBeInTheDocument();

        await act(async () => { resolveAnswers(null); });
        await flush();
        expect(screen.queryByTestId('dialog-skeleton')).toBeNull();
    });

    test('ошибка запроса тоже снимает скелетон', async () => {
        global.http = {get: jest.fn(() => Promise.reject(new Error('404'))), post: jest.fn(), put: jest.fn()};
        render(<DialogAnalysisTab item={interview(null)}/>);
        await flush();
        expect(screen.queryByTestId('dialog-skeleton')).toBeNull();
    });
});
