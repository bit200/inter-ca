import fs from 'fs';
import path from 'path';

// Попап «Порядок и веса»: клик по переключателю должен отзываться сразу.
// Раньше галочка ждала пересчёта баллов по всем вопросам (readQaBlocks) и
// казалась залипшей, поэтому пересчёт ушёл в отложенный рендер, а сама строка
// получила ощутимую зону клика и состояния hover/active/focus.
const dir = __dirname;
const jsx = fs.readFileSync(path.join(dir, 'DialogAnalysisTab.jsx'), 'utf8');
const scss = fs.readFileSync(path.join(dir, 'dialogAnalysis.module.scss'), 'utf8');
const block = (selector) => {
    const start = scss.indexOf(`\n${selector}{`);
    return scss.slice(start, scss.indexOf('\n}', start));
};

describe('отклик переключателей «Порядок и веса»', () => {
    test('пересчёт баллов отложен, а состояние переключателя применяется сразу', () => {
        expect(jsx).toMatch(/import React, \{[^}]*useDeferredValue[^}]*\} from 'react';/);
        expect(jsx).toMatch(/let appliedScoreParts = useDeferredValue\(disabledScoreParts\);/);
        // Производные наборы считаются от отложенного значения, не от исходного.
        expect(jsx).toMatch(/'technical' && appliedScoreParts\.has\(t\.id\)/);
        expect(jsx).toMatch(/'soft' && appliedScoreParts\.has\(t\.id\)/);
        // А сам checkbox по-прежнему читает мгновенное состояние.
        expect(jsx).toMatch(/checked=\{!disabledScoreParts\.has\(toggle\.id\)\}/);
    });

    test('пересортировка списка вопросов тоже отложена, отметка порядка - нет', () => {
        expect(jsx).toMatch(/let appliedSortOrder = useDeferredValue\(sortOrder\);/);
        expect(jsx).toMatch(/sortScoredBlocks\(blocks\.filter\(isScoredBlock\), appliedSortOrder\)/);
        expect(jsx).toMatch(/aria-checked=\{sortOrder === option\.order\}/);
    });

    test('строка переключателя кликается целиком и отвечает на наведение и нажатие', () => {
        const check = block('.scoreOrderCheck');
        expect(Number(check.match(/min-height: (\d+)px;/)[1])).toBeGreaterThanOrEqual(32);
        expect(check).toMatch(/&:hover\{[^}]*background:/);
        expect(check).toMatch(/&:active\{[^}]*background:/);
        expect(check).toMatch(/&:focus-within\{[^}]*outline:/);
        expect(check).toMatch(/accent-color: var\(--dlg-accent\);/);
        // Выключенный пункт виден по цвету текста, а не только по галочке.
        expect(check).toMatch(/&\[data-on="true"\]\{ color: var\(--dlg-ink\); \}/);
        expect(jsx).toMatch(/data-on=\{disabledScoreParts\.has\(toggle\.id\) \? undefined : 'true'\}/);
    });

    test('выбор порядка вопросов тоже вдавливается при нажатии', () => {
        expect(block('.scoreOrderRadio')).toMatch(/&:active\{[^}]*background:/);
    });
});
