import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {generationRows, linkWeakMocks, mocksByBlockNumber, practiceProgress, readMockUiVariant} from './weakMocksLogic';
import {WeakMockMark, WeakMocksNote, WeakMocksProgress, WeakMocksStrip} from './WeakMocks';

const generation = (over = {}) => ({
    _id: 1, sourceInterviewId: 7, state: 'published', interviewId: 'mesh-1', cd: '2026-09-10T10:00:00Z',
    weakQuestionIds: [{index: 0, question: 'Что такое замыкание?'}, {index: 2, question: 'Как работает event loop?'}],
    ...over,
});

const finished = (over = {}) => ({
    _id: 'a1', interviewId: 'mesh-1', status: 'completed', attemptNumber: 1,
    evaluate: [{questionId: 'q1', evaluate: {score: 6}}, {questionId: 'q2', evaluate: {score: 8}}],
    ...over,
});

const block = (number, title, score) => ({
    key: 'b' + number, number, technical: true,
    items: [{turn: {role: 'manager', text: title}}],
    evaluation: {state: 'done', score, max: 10},
});

describe('связь интервью с мок-интервью по слабым ответам', () => {
    test('вариант подачи читается из ?mockUi, неизвестный - полоса', () => {
        expect(readMockUiVariant('?tab=dialog&mockUi=summary')).toBe('summary');
        expect(readMockUiVariant('?mockUi=questions')).toBe('questions');
        expect(readMockUiVariant('?mockUi=nope')).toBe('strip');
        expect(readMockUiVariant('')).toBe('strip');
    });

    test('ответ ручки сборки: текущая и прошлые записи', () => {
        expect(generationRows({item: generation(), previous: [generation({_id: 2, interviewId: 'mesh-0'})]})).toHaveLength(2);
        expect(generationRows({item: null, previous: []})).toEqual([]);
        expect(generationRows({status: 'done'})).toEqual([]);
    });

    test('попытки кандидата цепляются к сборке по interviewId контейнера', () => {
        let [mock] = linkWeakMocks(
            [generation()],
            [finished(), finished({_id: 'a2', attemptNumber: 2, evaluate: [{questionId: 'q1', evaluate: {score: 9}}]}),
                finished({_id: 'x', interviewId: 'course-mesh'})],
            7
        );
        expect(mock.attempts.map(a => a._id)).toEqual(['a1', 'a2']);
        expect(mock.finished).toBe(2);
        expect(mock.bestScore).toBe(9);
        expect(mock.action).toEqual({kind: 'open', attemptId: 'a2'});
        expect(mock.weak).toEqual([{index: 0, question: 'Что такое замыкание?'}, {index: 2, question: 'Как работает event loop?'}]);
    });

    test('действие зависит от состояния сборки и последней попытки', () => {
        expect(linkWeakMocks([generation()], [], 7)[0].action).toEqual({kind: 'start'});
        expect(linkWeakMocks([generation()], [{_id: 'd', interviewId: 'mesh-1', status: 'started'}], 7)[0].action).toEqual({kind: 'open', attemptId: 'd'});
        let building = linkWeakMocks([generation({state: 'audio_pending', interviewId: null})], [], 7)[0];
        expect(building.phase).toBe('building');
        expect(building.action).toBeNull();
        expect(linkWeakMocks([generation({state: 'errored'})], [], 7)[0].phase).toBe('failed');
    });

    test('сборки чужого интервью отбрасываются, свежие идут первыми', () => {
        let list = linkWeakMocks([
            generation({_id: 1, interviewId: 'old', cd: '2026-09-01'}),
            generation({_id: 2, interviewId: 'new', cd: '2026-09-12'}),
            generation({_id: 3, interviewId: 'other', sourceInterviewId: 8}),
        ], [], 7);
        expect(list.map(mock => mock.interviewId)).toEqual(['new', 'old']);
    });

    test('слабые вопросы находят свои блоки по индексу, после пересчёта - по тексту', () => {
        let blocks = [block(1, 'Что такое замыкание?', 3), block(2, 'Расскажите о себе', 8), block(3, 'Как работает event loop?', 4)];
        let mocks = linkWeakMocks([generation()], [], 7);
        expect([...mocksByBlockNumber(mocks, blocks).keys()]).toEqual([1, 3]);

        let shifted = [block(1, 'Расскажите о себе', 8), block(2, 'Что такое замыкание?', 3), block(3, 'Какой-то другой вопрос', 4)];
        expect([...mocksByBlockNumber(mocks, shifted).keys()].sort()).toEqual([2, 3]);
    });

    test('«было -> стало»: средний балл слабых вопросов против лучшей попытки', () => {
        let blocks = [block(1, 'Что такое замыкание?', 3), block(2, 'Расскажите о себе', 8), block(3, 'Как работает event loop?', 4)];
        expect(practiceProgress(linkWeakMocks([generation()], [], 7), blocks)).toEqual({weakCount: 2, before: 3.5, after: null});
        expect(practiceProgress(linkWeakMocks([generation()], [finished()], 7), blocks).after).toBe(7);
    });
});

describe('три варианта подачи на вкладке разбора', () => {
    const blocks = [block(1, 'Что такое замыкание?', 3), block(3, 'Как работает event loop?', 4)];

    beforeEach(() => {
        global.navigate = jest.fn();
        global.http = {post: jest.fn(() => Promise.resolve({item: {_id: 'new-attempt'}}))};
    });

    test('без сборок ни один вариант ничего не рисует', () => {
        let {container} = render(<>
            <WeakMocksStrip mocks={[]}/>
            <WeakMocksProgress mocks={[]} blocks={blocks}/>
            <WeakMocksNote mocks={[]} blocks={blocks}/>
            <WeakMockMark mocks={null}/>
        </>);
        expect(container).toBeEmptyDOMElement();
    });

    test('полоса: строка сборки со статусом и кнопкой запуска', async () => {
        render(<WeakMocksStrip mocks={linkWeakMocks([generation()], [], 7)}/>);
        expect(screen.getByText('Отработка слабых мест')).toBeInTheDocument();
        expect(screen.getByText('Ещё не проходили')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Пройти'}));
        expect(global.http.post).toHaveBeenCalledWith('/mock-interview/my-list', {interviewId: 'mesh-1'}, {wo_notify: true});
        await waitFor(() => expect(global.navigate).toHaveBeenCalledWith('/mock-interviews/new-attempt'));
    });

    test('«было -> стало»: баллы и переход к результатам готовой попытки без новой', () => {
        render(<WeakMocksProgress mocks={linkWeakMocks([generation()], [finished()], 7)} blocks={blocks}/>);
        expect(screen.getByText('3,5')).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Открыть'}));
        expect(global.navigate).toHaveBeenCalledWith('/mock-interviews/a1');
        expect(global.http.post).not.toHaveBeenCalled();
    });

    test('начатая попытка: «Открыть» ведёт на неё, новое интервью не заводится', () => {
        render(<WeakMocksStrip mocks={linkWeakMocks([generation()], [{_id: 'd', interviewId: 'mesh-1', status: 'started'}], 7)}/>);
        expect(screen.queryByRole('button', {name: 'Продолжить'})).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Открыть'}));
        expect(global.navigate).toHaveBeenCalledWith('/mock-interviews/d');
        expect(global.http.post).not.toHaveBeenCalled();
    });

    test('на вопросах: метка с лучшим баллом мок-интервью', () => {
        render(<WeakMockMark mocks={linkWeakMocks([generation()], [finished()], 7)}/>);
        expect(screen.getByRole('button', {name: 'В мок-интервью: 7'})).toBeInTheDocument();
    });
});
