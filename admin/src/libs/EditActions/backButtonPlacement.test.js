import fs from 'fs';
import path from 'path';

// Карточка редактирования (DefOne): «Назад» / «К списку интервью» стоит
// над белой карточкой у левого края, а не внутри неё справа.
describe('место кнопки «Назад» в карточке редактирования', () => {
    let src = fs.readFileSync(path.join(__dirname, '..', 'DefOne.js'), 'utf8');
    let css = fs.readFileSync(path.join(__dirname, 'EditActions.css'), 'utf8');

    test('BackButton рендерится до белой карточки, а не внутри неё', () => {
        let back = src.indexOf('<BackButton');
        let card = src.indexOf('<div className="card">');
        expect(back).toBeGreaterThan(-1);
        expect(card).toBeGreaterThan(-1);
        expect(back).toBeLessThan(card);
        expect(src).toMatch(/<EditActions className="edit-actions--above">\s*<BackButton/);
    });

    test('полоса над карточкой не прижимает «Назад» вправо', () => {
        let rule = css.match(/\.edit-actions--above\s*\{([^}]*)\}/);
        expect(rule).not.toBeNull();
        expect(rule[1]).toMatch(/justify-content:\s*space-between/);
    });
});
