import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EvaluationListItemGroup from './EvaluationListItemGroup';

const renderGroup = (items, sort) => render(
    <MemoryRouter>
        <EvaluationListItemGroup examId={null} label="Без модуля" items={items} groupMode="module" sort={sort}/>
    </MemoryRouter>
);

const doneItem = {
    _id: 1,
    titleInfo: { title: 'Что такое хуки?' },
    evaluate: { status: 'done', result: { score: 5.7 } },
};

describe('EvaluationListItemGroup: строки группы', () => {
    it('у готовой оценки показывает только балл, без слова "Оценено"', () => {
        renderGroup([doneItem]);

        expect(screen.getByText('5.7/10')).toBeInTheDocument();
        expect(screen.queryByText('Оценено')).not.toBeInTheDocument();
    });

    it('у незавершённой оценки подпись статуса остаётся', () => {
        renderGroup([{ _id: 2, titleInfo: { title: 'Вопрос' }, evaluate: { status: 'pending' } }]);

        expect(screen.getByText('Ожидает')).toBeInTheDocument();
    });

    // Отступ между группами держит карточка, а не её содержимое: margin внутри
    // .card-body превращался в пустую полосу под последней строкой.
    it('расстояние между группами задаёт карточка, внутри неё лишнего отступа нет', () => {
        const { container } = renderGroup([doneItem]);

        const card = container.firstChild;
        expect(card).toHaveClass('card');
        expect(card).toHaveClass('groupCard');
        expect(container.querySelector('.card-body')).toBeNull();
    });
});

describe('EvaluationListItemGroup: сортировка по оценке', () => {
    const items = [
        { _id: 1, titleInfo: { title: 'Средний' }, evaluate: { status: 'done', result: { score: 5.7 } } },
        { _id: 2, titleInfo: { title: 'Низкий' }, evaluate: { status: 'done', result: { score: 3.5 } } },
        { _id: 3, titleInfo: { title: 'Высокий' }, evaluate: { status: 'done', result: { score: 9 } } },
    ];
    const rowIds = container => [...container.querySelectorAll('[data-testid="evaluation-group-item"]')]
        .map(el => Number(el.dataset.itemId));

    it('по убыванию строки идут от высокого балла к низкому', () => {
        const { container } = renderGroup(items, 'desc');

        expect(rowIds(container)).toEqual([3, 1, 2]);
    });

    it('по возрастанию - наоборот', () => {
        const { container } = renderGroup(items, 'asc');

        expect(rowIds(container)).toEqual([2, 1, 3]);
    });

    it('без сортировки порядок остаётся исходным', () => {
        const { container } = renderGroup(items);

        expect(rowIds(container)).toEqual([1, 2, 3]);
    });
});
