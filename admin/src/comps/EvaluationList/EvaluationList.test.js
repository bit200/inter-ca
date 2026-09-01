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
