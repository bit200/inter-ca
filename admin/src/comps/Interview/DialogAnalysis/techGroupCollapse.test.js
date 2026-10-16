import fs from 'fs';
import path from 'path';

// Техническая часть свёрнута в одну строку: заголовок, среднее и число вопросов
// по уровням («С пробелами (4)»); список раскрывается по клику.
const src = fs.readFileSync(path.join(__dirname, 'DialogAnalysisTab.jsx'), 'utf8');

describe('техническая часть: свёрнутая секция', () => {
    test('секция по умолчанию свёрнута', () => {
        expect(src).toMatch(/function TechnicalDigest[\s\S]*?useState\(false\)/);
    });
    test('в свёрнутой строке число вопросов по уровням, список только в раскрытом виде', () => {
        expect(src).toMatch(/\{group\.title\} \(\{group\.items\.length\}\)/);
        expect(src).toMatch(/\{open && digest && digest\.groups\.map/);
    });
});
