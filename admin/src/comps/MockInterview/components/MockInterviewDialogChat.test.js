import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MockInterviewDialogChat from './MockInterviewDialogChat';

jest.mock('@uiw/react-md-editor', () => ({
    Markdown: ({ source }) => <div>{source}</div>,
}));

const dialog = [
    { transcript: 'Ответ кандидата', advice: ['Приведите пример из практики', 'Скажите, на какую часть вопроса отвечаете'] },
];

describe('MockInterviewDialogChat', () => {
    it('в модалке рекомендаций каждый совет - отдельная врезка, а не сплошной текст', () => {
        render(<MockInterviewDialogChat dialog={dialog} mainQuestion={'Вопрос'}/>);
        fireEvent.click(screen.getByText('Есть рекомендации'));

        const items = document.querySelectorAll('[class*="chatAdviceModalItem"]');
        expect(items).toHaveLength(2);
        items.forEach(item => {
            // маркер-иконка отделяет совет от соседнего визуально
            expect(item.querySelector('i.iconoir-sparks')).toBeTruthy();
        });
        expect(screen.getByText('Приведите пример из практики')).toBeInTheDocument();
    });
});
