import fs from 'fs';
import path from 'path';

// В шапке блока разбора диалога стоит сам текст вопроса. Интервьюер бывает
// многословен, и без ограничения шапка растягивается на пол-экрана, поэтому
// заголовок обрезается до двух строк.
const scss = fs.readFileSync(path.join(__dirname, 'dialogAnalysis.module.scss'), 'utf8');
const block = (selector) => {
    const start = scss.indexOf(`\n${selector}{`);
    return start < 0 ? '' : scss.slice(start, scss.indexOf('\n}', start));
};

describe('заголовок вопроса в разборе диалога', () => {
    test('длинный текст обрезается до двух строк', () => {
        const title = block('.qaTitle strong.qaQuestion');
        expect(title).toMatch(/display: -webkit-box;/);
        expect(title).toMatch(/-webkit-box-orient: vertical;/);
        expect(title).toMatch(/-webkit-line-clamp: 2;/);
        expect(title).toMatch(/overflow: hidden;/);
    });

    test('полный текст обрезанного вопроса доступен в подсказке', () => {
        const jsx = fs.readFileSync(path.join(__dirname, 'DialogAnalysisTab.jsx'), 'utf8');
        expect(jsx).toMatch(/className=\{styles\.qaQuestion\} title=\{title\}/);
    });
});
