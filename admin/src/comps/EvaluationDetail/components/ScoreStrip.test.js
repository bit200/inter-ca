import React from 'react';
import { render, screen } from '@testing-library/react';

import ScoreStrip from './ScoreStrip';

const rules = [
    { key: 'evaluation.speech.clarity', from: 0, to: 10, advice: 'Говорите чётче' },
    { key: 'evaluation.practice.count', from: 0, to: 10, advice: 'Приведите примеры' },
];
const schemas = [
    { key: 'evaluation.speech.clarity', group: 'Речь', min: 0, max: 10 },
    { key: 'evaluation.practice.count', group: 'Практика', min: 0, max: 10 },
];

const chipByGroup = (group) => screen.getAllByTestId('metric-breakdown-row')
    .find(el => el.dataset.group === group);

const litSegments = (chip) => Array.from(chip.querySelectorAll('.mchipSeg i'))
    .filter(seg => seg.getAttribute('style')).length;

describe('ScoreStrip: общая оценка в линейке показателей', () => {
    // Раньше общий балл показывала полоса-термометр во всю ширину, а показатели -
    // мелкие чипы под ней: одно и то же измерение двумя разными способами.
    it('рисует общую оценку тем же чипом, что и показатели', () => {
        render(<ScoreStrip score={7} rules={rules} schemas={schemas} result={{
            evaluation: { speech: { clarity: 8 }, practice: { count: 3 } },
        }}/>);

        const total = screen.getByTestId('evaluate-score');
        expect(total.className).toContain('mchip');
        expect(total).toHaveTextContent('Общая оценка');
        expect(total).toHaveTextContent('7/10');
        expect(chipByGroup('Речь').className).toContain('mchip');
    });

    it('меряет общую оценку и показатели одной шкалой делений', () => {
        // 7 из 10 и 80% различаются, а вот 7/10 и 70% должны гореть одинаково -
        // ради этого чипы и приведены к одному виду.
        render(<ScoreStrip score={7} rules={rules} schemas={schemas} result={{
            evaluation: { speech: { clarity: 7 } },
        }}/>);

        expect(litSegments(screen.getByTestId('evaluate-score')))
            .toBe(litSegments(chipByGroup('Речь')));
    });

    it('помечает показатель, упавший в ноль', () => {
        render(<ScoreStrip score={7} rules={rules} schemas={schemas} result={{
            evaluation: { speech: { clarity: 0 }, practice: { count: 8 } },
        }}/>);

        expect(chipByGroup('Речь').dataset.zero).toBe('true');
        expect(chipByGroup('Речь').className).toContain('mchipZero');
        expect(chipByGroup('Практика').dataset.zero).toBe('false');
    });

    it('зовёт нажать только тот чип, по которому есть рекомендация', () => {
        render(<ScoreStrip score={7}
                           rules={[{ key: 'evaluation.speech.clarity', from: 8, to: 10, advice: 'Говорите чётче' }]}
                           schemas={schemas}
                           result={{ evaluation: { speech: { clarity: 2 }, practice: { count: 5 } } }}/>);

        expect(chipByGroup('Речь').dataset.clickable).toBe('false');
        expect(chipByGroup('Речь').querySelector('[data-testid="metric-breakdown-row-hint"]')).toBe(null);
    });
});
