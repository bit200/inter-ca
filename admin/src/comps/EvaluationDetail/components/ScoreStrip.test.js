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

    // Раньше чипы лежали прямо на подложке страницы и распадались на отдельные
    // пилюли - оценка ответа не читалась как один блок.
    it('собирает всю линейку в белую карточку страницы', () => {
        render(<ScoreStrip score={7} rules={rules} schemas={schemas} result={{
            evaluation: { speech: { clarity: 8 }, practice: { count: 3 } },
        }}/>);

        const card = screen.getByTestId('evaluation-strip-card');
        expect(card).toHaveClass('card');
        expect(card.querySelector('.card-body')).toBe(screen.getByTestId('evaluation-strip'));
        expect(card).toContainElement(screen.getByTestId('evaluate-score'));
        expect(card).toContainElement(chipByGroup('Речь'));
        expect(card).toContainElement(chipByGroup('Практика'));
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

// Читаемость линейки: подписи и цифры чипов - самый мелкий текст экрана, и
// раньше и то, и другое было бледным (название приглушённым --ev-muted,
// цифра - насыщенным тоном заливки).
describe('линейка читается: контрастные подписи и цифры', () => {
    const fs = require('fs');
    const path = require('path');
    const scss = () => fs.readFileSync(path.join(__dirname, '../evaluationDetail.module.scss'), 'utf8');
    const rule = (name) => new RegExp(`\\n\\.${name}\\{([^}]*)\\}`).exec(scss())[1];

    // Цвет текста jsdom не отдаёт (inline var() он не хранит), поэтому уровень
    // шкалы чип объявляет атрибутом - из него растут и тон цифры, и заливка.
    it('объявляет уровень шкалы у каждого чипа', () => {
        render(<ScoreStrip score={5.7} rules={rules} schemas={schemas} result={{
            evaluation: { speech: { clarity: 2 }, practice: { count: 8 } },
        }}/>);

        expect(screen.getByTestId('evaluate-score').dataset.level).toBe('mid');
        expect(chipByGroup('Речь').dataset.level).toBe('bad');
        expect(chipByGroup('Практика').dataset.level).toBe('good');
    });

    it('берёт цифре тёмный тон шкалы, а насыщенный оставляет делениям', () => {
        const fs = require('fs');
        const path = require('path');
        const chip = fs.readFileSync(path.join(__dirname, 'MetricChip.jsx'), 'utf8');

        expect(chip).toMatch(/mchipValue[^]*color: textColor/);
        expect(chip).toContain('getScoreTextColor(pct, max)');
    });

    it('набирает название показателя основным цветом текста, а не приглушённым', () => {
        expect(rule('mchipName')).toContain('var(--ev-ink)');
        expect(rule('mchipName')).not.toContain('var(--ev-muted)');
    });

    // Погасшие деления на цвете линий сливались с подложкой чипа, и низкий
    // процент читался как пустое место, а не как одно деление из пяти.
    it('гасит деления отдельным цветом шкалы, а не цветом линий', () => {
        expect(rule('mchipSeg')).toContain('var(--ev-seg-off)');
        expect(scss()).toContain('--ev-seg-off:');
    });
});
