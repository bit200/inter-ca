import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EvaluationList from './EvaluationList';

const renderList = (mode) => {
    global.t = (key) => key;
    global.http = { get: () => Promise.resolve({ items: [], total: 0, done: 0 }) };
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
});
