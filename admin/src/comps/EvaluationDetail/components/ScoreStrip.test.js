import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import ScoreStrip, { OVERALL_GROUP } from './ScoreStrip';

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

    // Группа "Итог" - это сам итоговый балл (schema key 'score'), и её чип
    // показывал то же число, что и "Общая оценка" рядом.
    describe('итоговый балл не дублируется отдельным чипом', () => {
        const totalSchemas = [...schemas, { key: 'score', group: OVERALL_GROUP, min: 0, max: 10 }];
        const totalRules = [...rules, { key: 'score', from: 0, to: 10, advice: 'Разберите ответ целиком' }];
        const result = { score: 7, evaluation: { speech: { clarity: 8 }, practice: { count: 3 } } };

        it('не рисует чип группы «Итог» рядом с общей оценкой', () => {
            render(<ScoreStrip score={7} rules={totalRules} schemas={totalSchemas} result={result}/>);

            expect(chipByGroup(OVERALL_GROUP)).toBeUndefined();
            expect(screen.getByTestId('evaluate-score')).toHaveTextContent('Общая оценка');
        });

        it('по клику на общую оценку открывает модалку «Итога»', () => {
            render(<ScoreStrip score={7} rules={totalRules} schemas={totalSchemas} result={result}/>);

            const total = screen.getByTestId('evaluate-score');
            expect(total.dataset.clickable).toBe('true');
            fireEvent.click(total);

            expect(screen.getByTestId('metric-breakdown-modal')).toHaveTextContent('Разберите ответ целиком');
        });

        it('без рекомендаций по итогу общая оценка не зовёт нажать', () => {
            render(<ScoreStrip score={7} rules={rules} schemas={totalSchemas} result={result}/>);

            expect(screen.getByTestId('evaluate-score').dataset.clickable).toBe('false');
        });
    });
});
