import fs from 'fs';
import path from 'path';

// Метка темы в шапке вопроса - нейтральный серый чип: «Технический» не
// выделяется акцентом, цветом в шапке говорит только балл.
const scss = fs.readFileSync(path.join(__dirname, 'dialogAnalysis.module.scss'), 'utf8');

describe('метка темы вопроса', () => {
    it('технический вопрос не перекрашивает чип в акцентный цвет', () => {
        const rules = [...scss.matchAll(/\.qaKind\[data-technical="true"\]\s*\{([^}]*)\}/g)].map(m => m[1]).join('');
        expect(rules).not.toMatch(/--dlg-accent/);
    });

    it('базовый чип серый', () => {
        const base = scss.match(/\.qaKind\{([^}]*)\}/)[1];
        expect(base).toMatch(/color:\s*var\(--dlg-muted\)/);
    });
});
