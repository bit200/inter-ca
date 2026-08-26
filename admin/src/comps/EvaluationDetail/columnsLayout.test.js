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
    const answerColumn = blockOf('.answerColumn');
    const sideColumn = blockOf('.sideColumn');

    it('колонки тянутся до общего низа, а не обрываются каждая по своему', () => {
        expect(columns).toMatch(/align-items:\s*stretch/);
        expect(columns).not.toMatch(/align-items:\s*(start|flex-start)/);
    });

    it('в каждой колонке карточка добирает остаток высоты', () => {
        expect(answerColumn).toMatch(/flex:\s*1/);
        expect(sideColumn).toMatch(/flex:\s*1/);
    });

    it('промежуток между ответом и выводом держит gap - свой margin карточек снят', () => {
        // У проектной .card есть margin-bottom: 1.5rem, и вместе с gap колонки
        // он давал под ответом разрыв вдвое шире остальных.
        expect(answerColumn).toMatch(/gap:\s*16px/);
        expect(answerColumn).toMatch(/margin-bottom:\s*0/);
        expect(sideColumn).toMatch(/margin-bottom:\s*0/);
    });
});
