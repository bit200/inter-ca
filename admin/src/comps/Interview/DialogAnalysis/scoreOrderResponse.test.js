import fs from 'fs';
import path from 'path';

// Попап «Порядок и веса»: клик по переключателю должен отзываться сразу и
// ловиться всей строкой, а не только галочкой. Пересчёт баллов по всем вопросам
// (readQaBlocks) ушёл в отложенный рендер, а строка сама обрабатывает клик:
// галочка нарисована своим квадратом, внутренности строки клик не перехватывают.
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
        // А сам переключатель по-прежнему читает мгновенное состояние.
        expect(jsx).toMatch(/aria-checked=\{!disabledScoreParts\.has\(toggle\.id\)\}/);
    });

    test('пересортировка списка вопросов тоже отложена, отметка порядка - нет', () => {
        expect(jsx).toMatch(/let appliedSortOrder = useDeferredValue\(sortOrder\);/);
        expect(jsx).toMatch(/sortScoredBlocks\(blocks\.filter\(isScoredBlock\), appliedSortOrder\)/);
        expect(jsx).toMatch(/aria-checked=\{sortOrder === option\.order\}/);
    });

    test('клик обрабатывает сама строка, а не галочка внутри неё', () => {
        // Строка - переключатель целиком: свой onClick, своя роль и свой фокус.
        expect(jsx).toMatch(/role="checkbox"\s+tabIndex=\{0\}/);
        expect(jsx).toMatch(/onClick=\{\(\) => onToggleScorePart\(toggle\.id\)\}/);
        // Клавиатура: пробел и Enter переключают ту же строку.
        expect(jsx).toMatch(/event\.key !== ' ' && event\.key !== 'Enter'/);
        // Галочка нарисована сама и кликов не перехватывает - иначе глобальный
        // input[type=checkbox] админки снова заберёт себе попадание.
        expect(jsx).toMatch(/<span className=\{styles\.scoreOrderBox\} aria-hidden="true"\/>/);
        expect(jsx).not.toMatch(/type="checkbox"/);
        expect(block('.scoreOrderCheck')).toMatch(/> \*\{ pointer-events: none; \}/);
    });

    test('строка переключателя отвечает на наведение, нажатие и фокус', () => {
        const check = block('.scoreOrderCheck');
        expect(Number(check.match(/min-height: (\d+)px;/)[1])).toBeGreaterThanOrEqual(32);
        expect(check).toMatch(/&:hover\{[^}]*background:/);
        expect(check).toMatch(/&:active\{[^}]*background:/);
        expect(check).toMatch(/&:focus-visible\{[^}]*outline:/);
        // Выключенный пункт виден по цвету текста, а не только по галочке.
        expect(check).toMatch(/&\[data-on="true"\]\{ color: var\(--dlg-ink\); \}/);
        expect(jsx).toMatch(/data-on=\{disabledScoreParts\.has\(toggle\.id\) \? undefined : 'true'\}/);
        // Включённая галочка залита акцентом, выключенная - только рамка.
        expect(block('.scoreOrderBox')).toMatch(/\[data-on="true"\] > &\{[^}]*background: var\(--dlg-accent\);/);
    });

    test('выбор порядка вопросов тоже вдавливается при нажатии', () => {
        expect(block('.scoreOrderRadio')).toMatch(/&:active\{[^}]*background:/);
    });
});
