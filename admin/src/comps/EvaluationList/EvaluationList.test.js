import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EvaluationList from './EvaluationList';

const renderList = (mode, items = []) => {
    global.t = (key) => key;
    global.http = { get: () => Promise.resolve({ items, total: items.length, done: 0 }) };
    return render(
        <MemoryRouter initialEntries={[mode ? `/evaluations?mode=${mode}` : '/evaluations']}>
            <EvaluationList/>
        </MemoryRouter>
    );
};

describe('EvaluationList: пустой список', () => {
    // Раньше на месте списка была одна строка "Нет оценок" - экран выглядел
    // обрезанным. Пустое состояние должно быть такой же карточкой, как группы
    // оценок, с объяснением и переходом на соседнюю вкладку.
    it('показывает карточку с объяснением вместо голой строки', async () => {
        const { findByTestId, queryByText } = renderList('exam');

        const empty = await findByTestId('evaluation-list-empty');
        expect(empty).toHaveClass('card');
        expect(empty.querySelector('.card-body')).toBeTruthy();
        expect(empty.textContent).toContain('Оценок по экзаменам пока нет');
        expect(queryByText('Нет оценок')).toBeNull();
    });

    it('предлагает переключиться на соседнюю вкладку', async () => {
        const { findByTestId } = renderList('exam');

        fireEvent.click(await findByTestId('evaluation-list-empty-switch'));

        await waitFor(async () => {
            const empty = await findByTestId('evaluation-list-empty');
            expect(empty.textContent).toContain('Оценок по модулям пока нет');
        });
    });
});

describe('EvaluationList: сортировка по дате диктовки', () => {
    // Ответы приходят с сервера в своём порядке, и найти свежую диктовку в
    // длинном списке было нечем. Сортируем по дате ответа (item.cd), а не по
    // дате оценки: оценка могла прийти пачкой позже и порядка ответов не хранит.
    const items = [
        { _id: 1, cd: '2026-05-02T10:00:00Z', titleInfo: { title: 'Средний', moduleInfo: { name: 'Модуль' } }, evaluate: { status: 'done' } },
        { _id: 2, cd: '2026-05-09T10:00:00Z', titleInfo: { title: 'Новый', moduleInfo: { name: 'Модуль' } }, evaluate: { status: 'done' } },
        { _id: 3, cd: '2026-04-20T10:00:00Z', titleInfo: { title: 'Старый', moduleInfo: { name: 'Модуль' } }, evaluate: { status: 'done' } },
    ];

    const ids = (utils) => utils.getAllByTestId('evaluation-group-item').map(el => el.dataset.itemId);

    it('по умолчанию показывает сначала новые', async () => {
        const utils = renderList('module', items);

        await utils.findAllByTestId('evaluation-group-item');
        expect(ids(utils)).toEqual(['2', '1', '3']);
    });

    it('по клику переворачивает порядок на «сначала старые»', async () => {
        const utils = renderList('module', items);

        fireEvent.click(await utils.findByTestId('evaluation-sort-date'));

        await waitFor(() => expect(ids(utils)).toEqual(['3', '1', '2']));
        expect(utils.getByTestId('evaluation-sort-date').textContent).toContain('Сначала старые');
    });

    it('показывает дату ответа в строке', async () => {
        const utils = renderList('module', items);

        const dates = await utils.findAllByTestId('evaluation-group-item-date');
        expect(dates).toHaveLength(3);
        expect(dates[0].textContent).toContain('9');
    });
});

describe('EvaluationList: переключатель сортировки по оценке', () => {
    it('по кругу переключает направление и держит его в адресе страницы', async () => {
        const { findByTestId } = renderList();

        const btn = await findByTestId('evaluation-sort-score');
        expect(btn).toHaveAttribute('data-sort', 'none');
        expect(btn.textContent).toContain('По оценке');

        fireEvent.click(btn);
        await waitFor(() => expect(btn).toHaveAttribute('data-sort', 'desc'));
        expect(btn.textContent).toContain('Сначала высокие');

        fireEvent.click(btn);
        await waitFor(() => expect(btn).toHaveAttribute('data-sort', 'asc'));
        expect(btn.textContent).toContain('Сначала низкие');

        fireEvent.click(btn);
        await waitFor(() => expect(btn).toHaveAttribute('data-sort', 'none'));
    });

    it('сортировка не слетает при переключении вкладки', async () => {
        const { findByTestId } = renderList('exam');

        const btn = await findByTestId('evaluation-sort-score');
        fireEvent.click(btn);
        await waitFor(() => expect(btn).toHaveAttribute('data-sort', 'desc'));

        fireEvent.click(await findByTestId('evaluation-group-mode-module'));

        await waitFor(() => expect(btn).toHaveAttribute('data-sort', 'desc'));
    });

    // Две сортировки об разном: дата держит порядок групп, балл переставляет
    // строки внутри группы. Включение балла не должно ломать порядок по дате
    // среди равных.
    it('сортирует строки по баллу поверх сортировки по дате', async () => {
        const items = [
            { _id: 1, cd: '2026-05-02T10:00:00Z', titleInfo: { title: 'Средний', moduleInfo: { name: 'Модуль' } }, evaluate: { status: 'done', result: { score: 5 } } },
            { _id: 2, cd: '2026-05-09T10:00:00Z', titleInfo: { title: 'Низкий', moduleInfo: { name: 'Модуль' } }, evaluate: { status: 'done', result: { score: 2 } } },
            { _id: 3, cd: '2026-04-20T10:00:00Z', titleInfo: { title: 'Высокий', moduleInfo: { name: 'Модуль' } }, evaluate: { status: 'done', result: { score: 9 } } },
        ];
        const utils = renderList('module', items);
        const ids = () => utils.getAllByTestId('evaluation-group-item').map(el => el.dataset.itemId);

        await utils.findAllByTestId('evaluation-group-item');
        expect(ids()).toEqual(['2', '1', '3']);

        fireEvent.click(utils.getByTestId('evaluation-sort-score'));

        await waitFor(() => expect(ids()).toEqual(['3', '1', '2']));
    });
});

describe('EvaluationList: фильтр «Задачи»', () => {
    // Список показывал только ответы на вопросы - проверки live-coding задач
    // (они уже входят в счётчик виджета) нигде не просматривались.
    const reviews = [
        { _id: 'a', exam: 7, question: 11, status: 'done', title: 'Две суммы', score: 7 },
        { _id: 'b', exam: 7, question: 12, status: 'pending', title: 'Палиндром', score: null },
    ];

    it('показывает задачи экзамена из /my-code-reviews, а не ответы', async () => {
        global.t = (key) => key;
        const get = jest.fn(url => Promise.resolve(url === '/my-code-reviews' ? { items: reviews } : { items: [], total: 0, done: 0 }));
        global.http = { get };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations?mode=tasks']}><EvaluationList/></MemoryRouter>
        );

        const rows = await utils.findAllByTestId('evaluation-group-item');
        expect(rows.map(r => r.textContent)).toEqual(['Две суммы', 'Палиндром']);
        expect(rows[0]).toHaveAttribute('href', '/quiz/7');
        expect(utils.getByTestId('evaluation-group-header').dataset.groupLabel).toBe('Экзамен #7');
        expect(utils.getByText('1/2 оценено')).toBeTruthy();
        expect(get).not.toHaveBeenCalledWith('/evaluate-list', expect.anything());
    });

    it('показывает задачи модулей (без экзамена) отдельной группой', async () => {
        global.t = (key) => key;
        const get = jest.fn(() => Promise.resolve({ items: [
            { _id: 'm', question: 5, status: 'done', title: 'Фибоначчи', score: 8, courseModule: 'x' },
        ] }));
        global.http = { get };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations?mode=tasks']}><EvaluationList/></MemoryRouter>
        );

        const rows = await utils.findAllByTestId('evaluation-group-item');
        expect(rows.map(r => r.textContent)).toEqual(['Фибоначчи']);
        expect(utils.getByTestId('evaluation-group-header').dataset.groupLabel).toBe('Задачи модулей');
    });

    it('строка задачи модуля ведёт на страницу оценки', async () => {
        global.t = (key) => key;
        global.http = { get: jest.fn(() => Promise.resolve({ items: [
            { _id: 'm', question: 5, status: 'done', title: 'Фибоначчи', score: 8, courseModule: 'x',
              result: { verdict: 'pass', summary: 'Решение верное', scores: { correctness: 9 }, reasons: {} } },
        ] })) };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations?mode=tasks']}><EvaluationList/></MemoryRouter>
        );

        const row = await utils.findByTestId('evaluation-group-item');
        expect(row.getAttribute('href')).toBe('/evaluations/task/m');
    });

    it('кнопка «Задачи» переключает фильтр', async () => {
        const { findByTestId } = renderList();

        fireEvent.click(await findByTestId('evaluation-group-mode-tasks'));

        const empty = await findByTestId('evaluation-list-empty');
        expect(empty.textContent).toContain('Проверок задач пока нет');
    });
});
