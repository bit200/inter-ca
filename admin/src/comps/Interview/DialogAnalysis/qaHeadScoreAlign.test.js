import fs from 'fs';
import path from 'path';

// Балл вопроса в шапке блока стоит справа всегда. Шапка переносится, когда
// отметки нетехнического ответа не влезают в строку с заголовком, и без
// прижатия перенесённый блок с баллом уезжал к левому краю.
const scss = fs.readFileSync(path.join(__dirname, 'dialogAnalysis.module.scss'), 'utf8');
const block = (selector) => {
    const start = scss.indexOf(`\n${selector}{`);
    return scss.slice(start, scss.indexOf('\n}', start));
};

describe('балл в шапке вопроса разбора диалога', () => {
    test('блок с отметками и баллом прижат к правому краю и после переноса', () => {
        const actions = block('.qaActions');
        expect(actions).toMatch(/margin-left: auto;/);
        expect(actions).toMatch(/justify-content: flex-end;/);
    });
});
