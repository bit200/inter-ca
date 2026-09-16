const fs = require('fs');
const path = require('path');

const tableJs = fs.readFileSync(path.join(__dirname, 'Table.js'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../../App.js'), 'utf8');

// После создания записи таблица может сразу открыть её карточку, а не
// оставлять человека в списке искать только что добавленное.
describe('открытие записи сразу после создания (openAfterCreate)', () => {
    const post = tableJs.slice(tableJs.indexOf('    post(obj) {'), tableJs.indexOf('    put(obj) {'));

    it('post переходит в карточку созданной записи с хвостом адреса', () => {
        expect(post).toMatch(/openAfterCreate && r && r\._id/);
        expect(post).toMatch(/global\.navigate\(window\.location\.pathname \+ '\/' \+ r\._id \+ tail\)/);
    });

    it('новое интервью открывается на вкладке «Обзор»', () => {
        const at = appJs.indexOf('        interviews: {');
        const block = appJs.slice(at, appJs.indexOf('        quiz: {', at));
        expect(block).toMatch(/openAfterCreate: '\?tab=overview'/);
    });
});
