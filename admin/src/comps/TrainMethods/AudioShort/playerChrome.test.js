import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'Player.css'), 'utf8');

const ruleOf = (selector) => {
    const at = css.indexOf(selector + ' {');
    expect(at).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
};

describe('пилюля плеера записи', () => {
    it('стоит по центру нижнего края, а не прижата к левому', () => {
        const player = ruleOf('.player');
        expect(player).toMatch(/left:\s*0;/);
        expect(player).toMatch(/right:\s*0;/);
        expect(player).toMatch(/margin:\s*0 auto;/);
    });

    it('на телефоне тоже центрирована', () => {
        const mobile = css.slice(css.indexOf('@media (max-width: 575.98px)'));
        expect(mobile).not.toMatch(/left:\s*10px/);
    });

    it('залита белым фоном карточек, а не серым фоном страницы', () => {
        expect(ruleOf('.player')).toMatch(/background:\s*var\(--bs-theme-white-color\)/);
        expect(css).not.toMatch(/--bs-body-bg/);
    });
});
