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
    { key: 'evaluation.speech.clarity', group: 'Речь' },
    { key: 'evaluation.practice.count', group: 'Практика' },
];

const rowByGroup = (group) => screen.getAllByTestId('metric-breakdown-row')
    .find(el => el.dataset.group === group);

describe('AdviceSection: показатель с 0%', () => {
    it('помечает нулевую строку, оставляя остальные без подсветки', () => {
        render(<AdviceSection rules={rules} schemas={schemas} result={{
            evaluation: { speech: { clarity: 0 }, practice: { count: 8 } },
        }}/>);

        const zeroRow = rowByGroup('Речь');
        expect(zeroRow.dataset.pct).toBe('0');
        expect(zeroRow.dataset.zero).toBe('true');
        expect(zeroRow.className).toContain('metricRowZero');

        const okRow = rowByGroup('Практика');
        expect(okRow.dataset.zero).toBe('false');
        expect(okRow.className).not.toContain('metricRowZero');
    });

    it('подсвечивает нулевую строку и там, где по ней нечего открыть', () => {
        // Значение вне диапазона правила - совета нет, строка статичная,
        // но 0% всё равно должен быть виден.
        render(<AdviceSection
            rules={[{ key: 'evaluation.speech.clarity', from: 8, to: 10, advice: 'Говорите чётче' }]}
            schemas={schemas}
            result={{ evaluation: { speech: { clarity: 2 } } }}/>);

        const row = rowByGroup('Речь');
        expect(row.dataset.clickable).toBe('false');
        expect(row.dataset.zero).toBe('true');
        expect(row.className).toContain('metricRowZero');
    });
});
