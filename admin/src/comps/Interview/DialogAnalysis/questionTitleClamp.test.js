import fs from 'fs';
import path from 'path';

// В шапке блока разбора диалога стоит сам текст вопроса. Интервьюер бывает
// многословен, а полный текст и так стоит репликой в блоке, поэтому в шапке
// короткая версия вопроса в одну строку.
const scss = fs.readFileSync(path.join(__dirname, 'dialogAnalysis.module.scss'), 'utf8');
const block = (selector) => {
    const start = scss.indexOf(`\n${selector}{`);
    return start < 0 ? '' : scss.slice(start, scss.indexOf('\n}', start));
};

describe('заголовок вопроса в разборе диалога', () => {
    test('короткий заголовок не выходит за одну строку', () => {
        const title = block('.qaTitle strong.qaQuestion');
        expect(title).toMatch(/display: -webkit-box;/);
        expect(title).toMatch(/-webkit-box-orient: vertical;/);
        expect(title).toMatch(/-webkit-line-clamp: 1;/);
        expect(title).toMatch(/overflow: hidden;/);
    });

    test('в шапке короткая версия, полный текст - в подсказке', () => {
        const jsx = fs.readFileSync(path.join(__dirname, 'DialogAnalysisTab.jsx'), 'utf8');
        expect(jsx).toMatch(/className=\{styles\.qaQuestion\} title=\{title\}>\{shortTitle\}<\/strong>/);
    });
});
