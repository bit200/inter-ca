import React from 'react';
import { render, screen } from '@testing-library/react';
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
    ],
};

describe('ExplainSection', () => {
    const renderIt = () => render(<ExplainSection onExplain={() => Promise.resolve({ explain })} initialExplain={explain}/>);

    it('показывает округлённую оценку компонента, а не сырую дробь', () => {
        renderIt();
        expect(screen.getByText('0.78')).toBeInTheDocument();
        expect(screen.queryByText('0.7777777777777778')).not.toBeInTheDocument();
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
