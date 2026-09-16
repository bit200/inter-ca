const fs = require('fs');
const path = require('path');

const tableJs = fs.readFileSync(path.join(__dirname, 'Table.js'), 'utf8');
const scss = fs.readFileSync(path.join(__dirname, '../../scss/appStyle.scss'), 'utf8');

// Дети .datatable-top плавают (float: right), и TopComp - например
// «Собрано по вашим ответам» на /mock-interviews - съёживался в правую колонку.
describe('верхний блок таблицы (TopComp)', () => {
    it('обёртка TopComp помечена своим классом', () => {
        expect(tableJs).toMatch(/className="datatable-top-comp">\s*<TopComp>/);
    });

    it('обёртка идёт отдельной строкой на всю ширину', () => {
        const at = scss.indexOf('.datatable-top > .datatable-top-comp {');
        expect(at).toBeGreaterThan(-1);
        const body = scss.slice(at, scss.indexOf('}', at));
        expect(body).toMatch(/float:\s*none/);
        expect(body).toMatch(/clear:\s*both/);
        expect(body).toMatch(/width:\s*100%/);
    });
});
