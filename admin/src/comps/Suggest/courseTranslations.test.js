const fs = require('fs');
const path = require('path');

describe('переводы PreviewCourseModule', () => {
    it('каждый ключ t(...) есть в lngs.js (doubleRepeatInformation без опечатки)', () => {
        const src = fs.readFileSync(path.join(__dirname, 'PreviewCourseModule.js'), 'utf8');
        const lngs = fs.readFileSync(path.join(__dirname, '../i18/lngs.js'), 'utf8');
        const keys = [...src.matchAll(/\bt\('([A-Za-z0-9_]+)'\)/g)].map(m => m[1]);
        expect(keys).toContain('doubleRepeatInformation');
        const missing = keys.filter(k => !lngs.includes(`"${k}": {`));
        expect(missing).toEqual([]);
    });
});
