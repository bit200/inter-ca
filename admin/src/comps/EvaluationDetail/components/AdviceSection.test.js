import React from 'react';
import { render, screen } from '@testing-library/react';

import AdviceSection from './AdviceSection';

// Диапазоны метрик берутся из правил советов (см. buildMetricRanges), поэтому
// каждая проверка задаёт правило-«шкалу» и подставляет в result значение на
// нужном конце этой шкалы.
const rules = [
    { key: 'evaluation.speech.clarity', from: 0, to: 10, advice: 'Говорите чётче' },
    { key: 'evaluation.practice.count', from: 0, to: 10, advice: 'Приведите примеры' },
];
const schemas = [
    { key: 'evaluation.speech.clarity', group: 'Речь', min: 0, max: 10 },
    { key: 'evaluation.practice.count', group: 'Практика', min: 0, max: 10 },
];

describe('AdviceSection: заметки на полях', () => {
    it('показывает совет по проседающей группе и молчит про сильные', () => {
        render(<AdviceSection rules={rules} schemas={schemas} result={{
            evaluation: { speech: { clarity: 0 }, practice: { count: 9 } },
        }}/>);

        const out = screen.getByTestId('metric-advice-out');
        expect(out).toHaveTextContent('Говорите чётче');
        expect(out).not.toHaveTextContent('Приведите примеры');
    });

    // Показатели переехали в линейку чипов над ответом (ScoreStrip) - если
    // карточка советов снова начнёт их печатать, на экране будет два одинаковых
    // разбора балла.
    it('не дублирует показатели, когда советов нет', () => {
        const { container } = render(<AdviceSection rules={[]} schemas={schemas} result={{
            evaluation: { speech: { clarity: 9 } },
        }}/>);

        expect(container.firstChild).toBe(null);
    });
});
