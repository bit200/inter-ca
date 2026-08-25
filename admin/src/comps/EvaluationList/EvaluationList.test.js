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
