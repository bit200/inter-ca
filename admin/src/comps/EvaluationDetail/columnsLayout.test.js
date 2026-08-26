const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, 'evaluationDetail.module.scss'), 'utf8');

// Тело блока по заголовку селектора: скобки считаем вручную - в scss есть
// вложенные правила.
const blockOf = (selector) => {
    const at = css.indexOf(selector + '{');
    expect(at).toBeGreaterThan(-1);

    let depth = 0;
    for (let i = at + selector.length; i < css.length; i++) {
        if (css[i] === '{') depth++;
        if (css[i] === '}' && --depth === 0) return css.slice(at + selector.length + 1, i);
    }
    throw new Error(`не закрыт блок ${selector}`);
};

describe('колонки разбора ответа', () => {
    const columns = blockOf('.columns');
    const answerCard = blockOf('.answerColumn > :global(.card)');
    const summaryCard = blockOf('.summarySlot > :global(.card)');
    const sideCard = blockOf('.sideColumn > :global(.card)');

    it('карточки стоят в общей сетке, обёртки колонок для неё прозрачны', () => {
        expect(columns).toMatch(/display:\s*grid/);
        expect(blockOf('.answerColumn,\n.sideColumn,\n.summarySlot')).toMatch(/display:\s*contents/);

        expect(answerCard).toMatch(/grid-column:\s*1/);
        expect(answerCard).toMatch(/grid-row:\s*1/);
        expect(summaryCard).toMatch(/grid-column:\s*1/);
        expect(summaryCard).toMatch(/grid-row:\s*2/);
        expect(sideCard).toMatch(/grid-column:\s*2/);
    });

    it('разбор занимает оба ряда - его низ совпадает с низом вывода', () => {
        expect(sideCard).toMatch(/grid-row:\s*1\s*\/\s*-1/);
        // Лишнюю высоту забирает первый ряд (ответ), а не пустое место под
        // выводом - иначе при длинном разборе низ ответа обрывается выше.
        expect(columns).toMatch(/grid-template-rows:\s*1fr\s+auto/);
    });

    it('промежуток между ответом и выводом держит сама карточка вывода', () => {
        // row-gap рисуется и над пустым рядом: без вывода разбор кончался бы
        // на 16px ниже ответа. Поэтому отступ - на карточке.
        expect(columns).toMatch(/row-gap:\s*0/);
        expect(summaryCard).toMatch(/margin-top:\s*16px/);
        // У проектной .card свой margin-bottom: 1.5rem - в сетке он лишний.
        expect(blockOf('.columns :global(.card)')).toMatch(/margin-bottom:\s*0/);
    });
});
