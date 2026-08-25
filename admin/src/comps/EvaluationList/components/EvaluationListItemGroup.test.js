import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EvaluationListItemGroup from './EvaluationListItemGroup';

const renderGroup = (items) => render(
    <MemoryRouter>
        <EvaluationListItemGroup examId={null} label="Без модуля" items={items} groupMode="module"/>
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
