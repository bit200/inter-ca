import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ExplainSection from './ExplainSection';

const explain = {
    summary: 'Ответ содержит фундаментальную техническую ошибку.',
    components: [
        {
            name: 'RELEVANCE',
            score: 0.7777777777777778,
            verdict: 'Ответ частично касается темы.',
            suggestion: 'Разделяйте ответственность useCallback и React.memo.',
        },
        {
            name: 'DEPTH',
            score: 0.5,
            verdict: 'Раскрытие темы поверхностное.',
        },
    ],
};

describe('ExplainSection', () => {
    const renderIt = () => render(<ExplainSection onExplain={() => Promise.resolve({ explain })} initialExplain={explain}/>);

    it('подписывает компоненты по-русски, а не техническим ключом метрики', () => {
        renderIt();
        expect(screen.getAllByText('Релевантность').length).toBeGreaterThan(0);
        expect(screen.queryByText('RELEVANCE')).not.toBeInTheDocument();
        expect(screen.queryByText('DEPTH')).not.toBeInTheDocument();
    });

    it('даёт вкладки по параметрам и оставляет только выбранный', () => {
        renderIt();
        const tabs = screen.getByTestId('evaluate-explain-tabs');
        expect(tabs).toBeInTheDocument();
        // по умолчанию открыты "Все"
        expect(screen.getByText('Ответ частично касается темы.')).toBeInTheDocument();
        expect(screen.getByText('Раскрытие темы поверхностное.')).toBeInTheDocument();

        fireEvent.click(within(tabs).getByText('Глубина'));
        expect(screen.queryByText('Ответ частично касается темы.')).not.toBeInTheDocument();
        expect(screen.getByText('Раскрытие темы поверхностное.')).toBeInTheDocument();

        fireEvent.click(within(tabs).getByText('Все'));
        expect(screen.getByText('Ответ частично касается темы.')).toBeInTheDocument();
    });

    it('не показывает вкладки, когда компонент всего один', () => {
        render(<ExplainSection onExplain={() => Promise.resolve({ explain })}
                               initialExplain={{ ...explain, components: [explain.components[0]] }}/>);
        expect(screen.queryByTestId('evaluate-explain-tabs')).not.toBeInTheDocument();
    });

    it('показывает округлённую оценку компонента, а не сырую дробь', () => {
        renderIt();
        expect(screen.getByText('0.78')).toBeInTheDocument();
        expect(screen.queryByText('0.7777777777777778')).not.toBeInTheDocument();
    });

    it('переносит общий вывод в слот под ответом, а не оставляет его над вкладками', () => {
        const slot = document.createElement('div');
        document.body.appendChild(slot);
        render(<ExplainSection onExplain={() => Promise.resolve({ explain })}
                               initialExplain={explain} summarySlot={slot}/>);

        const summary = screen.getByTestId('evaluate-explain-summary');
        expect(summary).toHaveTextContent(explain.summary);
        expect(slot.contains(summary)).toBe(true);
        // в карточке расшифровки, над вкладками, вывода больше нет
        expect(within(screen.getByTestId('evaluate-explain-result')).queryByTestId('evaluate-explain-summary'))
            .toBeNull();
    });

    it('без слота оставляет вывод на прежнем месте - в карточке расшифровки', () => {
        renderIt();
        const result = screen.getByTestId('evaluate-explain-result');
        expect(within(result).getByTestId('evaluate-explain-summary')).toHaveTextContent(explain.summary);
    });

    it('выделяет рекомендацию отдельным акцентным блоком, а не просто текстом', () => {
        renderIt();
        const suggestion = screen.getByText(explain.components[0].suggestion).closest('div');
        expect(suggestion).toHaveClass('explainComponentSuggestion');
        // сам цвет живёт в scss и в jsdom не проверяется - следим хотя бы за
        // тем, что рекомендация осталась врезкой с иконкой, а не сноской
        expect(suggestion.querySelector('i.iconoir-light-bulb-on')).not.toBeNull();
    });
});
