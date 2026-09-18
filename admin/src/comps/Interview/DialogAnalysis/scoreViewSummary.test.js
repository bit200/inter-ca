import fs from 'fs';
import path from 'path';
import {scoreViewSummary} from './finalScoreWeights';

// Шапка «Вопросов» рассказывает, чем вид списка отличается от исходного:
// порядок не по разговору и выключенные из балла компоненты. Исходный вид
// ничего не показывает - сообщать там нечего.
describe('сводка настроек списка вопросов', () => {
    test('порядок по разговору и все компоненты включены - сводки нет', () => {
        expect(scoreViewSummary('default', new Set())).toEqual([]);
    });

    test('нестандартный порядок назван словами с экрана', () => {
        expect(scoreViewSummary('desc', new Set())).toEqual([{id: 'sort', label: 'Сначала высокий балл'}]);
        expect(scoreViewSummary('asc', new Set())).toEqual([{id: 'sort', label: 'Сначала низкий балл'}]);
    });

    test('выключенный компонент балла назван тем, чего в балле нет', () => {
        expect(scoreViewSummary('default', new Set(['style']))).toEqual([{id: 'style', label: 'Без стиля ответа'}]);
        expect(scoreViewSummary('default', ['delivery'])).toEqual([{id: 'delivery', label: 'Без подачи'}]);
    });

    test('порядок и веса сразу - сначала порядок, потом компоненты', () => {
        expect(scoreViewSummary('asc', new Set(['delivery', 'style'])).map(mark => mark.label))
            .toEqual(['Сначала низкий балл', 'Без стиля ответа', 'Без подачи']);
    });

    test('сводка нарисована в шапке рядом с кнопкой «Порядок и веса»', () => {
        const jsx = fs.readFileSync(path.join(__dirname, 'DialogAnalysisTab.jsx'), 'utf8');
        expect(jsx).toMatch(/scoreViewSummary\(sortOrder, disabledScoreParts\)/);
        expect(jsx).toMatch(/className=\{styles\.scoreViewMark\}/);
    });

    test('метки говорят сами за себя - подписи перед ними нет', () => {
        const jsx = fs.readFileSync(path.join(__dirname, 'DialogAnalysisTab.jsx'), 'utf8');
        expect(jsx).not.toMatch(/Список настроен/);
    });
});
