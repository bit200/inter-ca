const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, 'evaluationDetail.module.scss'), 'utf8');

// Вырезает тело блока по заголовку селектора: скобки внутри считаем вручную,
// потому что в scss встречаются вложенные правила.
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

const tokensOf = (block) => {
    const found = {};
    for (const [, name, value] of block.matchAll(/(--ev-[\w-]+)\s*:\s*([^;]+);/g)) found[name] = value.trim();
    return found;
};

describe('тема страницы разбора ответа', () => {
    const light = tokensOf(blockOf('.page'));
    const dark = tokensOf(blockOf(':global(html[data-bs-theme="dark"]) .page'));

    it('красится обеими темами сайта: у светлой и тёмной один набор переменных', () => {
        expect(Object.keys(light).length).toBeGreaterThan(0);
        expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    });

    it('значения тем разные - приём один, цвета свои', () => {
        for (const name of Object.keys(light)) expect(dark[name]).not.toBe(light[name]);
    });

    it('по умолчанию страница светлая, тёмные цвета только под data-bs-theme=dark', () => {
        expect(light['--ev-bg']).toBe('#f7f9fb');
        expect(dark['--ev-bg']).toBe('#0f1411');
        // Тёмная поверхность не должна протекать в основной блок - иначе на
        // светлой теме сайта страница снова окажется чёрной.
        for (const value of Object.values(dark)) {
            if (value.startsWith('#')) expect(Object.values(light)).not.toContain(value);
        }
    });

    it('карточки остаются проектными: --bs-secondary-bg страница не подменяет', () => {
        // У бутстрапа фон карточки растёт из --bs-secondary-bg
        // (.card{--bs-card-bg: var(--bs-secondary-bg)}), и подставленная сюда
        // мягкая подложка красила серым все .card страницы - при том что по
        // всему проекту они белые.
        expect(css).not.toMatch(/--bs-secondary-bg\s*:/);
    });

    it('мягкие подложки страницы берут --ev-soft, а не проектный --bs-secondary-bg', () => {
        expect(css).not.toMatch(/background:\s*var\(--bs-secondary-bg\)/);
        expect(css).toMatch(/background:\s*var\(--ev-soft\)/);
    });

    it('вёрстка не хардкодит цвета мимо темы, а берёт их из --ev-* и палитры оценки', () => {
        const body = css.slice(css.indexOf('// Палитра страницы'));
        // Белый на заливке зелёной кнопки - не цвет темы: он одинаков в обеих.
        const hex = (body.match(/#[0-9a-fA-F]{3,8}\b/g) || []).filter(v => !/^#(fff|ffffff)$/i.test(v));
        expect(hex).toEqual([]);
    });
});

describe('оценка куратора: второй ярус карточки', () => {
    // Цветная полоса слева повторяла то, что уже говорит сам балл: он набран
    // цветом своей оценки. Ярус отделяет от машинной оценки только линия сверху.
    it('отделён линией сверху и не красится полосой слева', () => {
        const band = blockOf('.mentorBand');

        expect(band).toMatch(/border-top:\s*1px solid/);
        expect(band).not.toMatch(/border-left/);
    });
});
