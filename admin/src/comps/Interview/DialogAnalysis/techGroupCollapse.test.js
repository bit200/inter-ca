import fs from 'fs';
import path from 'path';

// Группы технической части («С пробелами», «Слабо») свёрнуты по умолчанию
// и показывают только число вопросов.
const src = fs.readFileSync(path.join(__dirname, 'DialogAnalysisTab.jsx'), 'utf8');

describe('техническая часть: свёрнутые группы', () => {
    test('группа по умолчанию свёрнута', () => {
        expect(src).toMatch(/function TechGroup[\s\S]*?useState\(false\)/);
    });
    test('в заголовке показано число вопросов, список только в раскрытом виде', () => {
        expect(src).toMatch(/\{group\.title\} <span[^>]*>\(\{group\.items\.length\}\)<\/span>/);
        expect(src).toMatch(/\{open && <ul>/);
    });
});
