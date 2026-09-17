import fs from 'fs';
import path from 'path';
import {isUnrecognizedTurn, turnTimeRange, turnsCountLabel, UNRECOGNIZED_TURN_TEXT} from './dialogAnalysisFormat';

const scss = fs.readFileSync(path.join(__dirname, 'dialogAnalysis.module.scss'), 'utf8');
const block = (selector) => {
    const start = scss.indexOf(`\n${selector}{`);
    return start < 0 ? '' : scss.slice(start, scss.indexOf('\n}', start));
};

describe('расшифровка переписки пузырями, как в карточке звонка', () => {
    test('интервьюер слева, кандидат справа в зелёной рамке', () => {
        expect(block('.turn')).toMatch(/justify-self: start;/);
        const client = block('.turn[data-role="client"]');
        expect(client).toMatch(/justify-self: end;/);
        expect(client).toMatch(/border-color: var\(--dlg-guest-line\);/);
    });

    test('у пузыря рамка целиком, без полосы роли слева', () => {
        expect(block('.turn')).toMatch(/border: 1px solid var\(--dlg-line\);/);
        expect(scss).not.toMatch(/\.turn[^{]*\{[^}]*border-left/);
    });

    test('подпись числа реплик у заголовка склоняется', () => {
        expect(turnsCountLabel(1)).toBe('1 реплика');
        expect(turnsCountLabel(3)).toBe('3 реплики');
        expect(turnsCountLabel(8)).toBe('8 реплик');
        expect(turnsCountLabel(12)).toBe('12 реплик');
        expect(turnsCountLabel(21)).toBe('21 реплика');
        expect(turnsCountLabel(1160)).toBe('1160 реплик');
        expect(turnsCountLabel(undefined)).toBe('0 реплик');
    });

    test('время реплики - диапазоном, короткая реплика - одним моментом', () => {
        expect(turnTimeRange({startMs: 1000, endMs: 4000})).toEqual({from: '0:01', to: '0:04'});
        expect(turnTimeRange({startMs: 1000, endMs: 1400})).toEqual({from: '0:01', to: null});
        expect(turnTimeRange({startMs: 65000})).toEqual({from: '1:05', to: null});
    });
});

describe('реплика без распознанного текста', () => {
    test('пустой текст считается нераспознанной речью, а не репликой с текстом', () => {
        expect(isUnrecognizedTurn({text: '', words: [], confidence: null})).toBe(true);
        expect(isUnrecognizedTurn({text: '   '})).toBe(true);
        expect(isUnrecognizedTurn({})).toBe(true);
        expect(isUnrecognizedTurn({text: 'Конечно, можно.', confidence: 0.43})).toBe(false);
    });

    test('вместо прочерка реплика пишет, что речь не распознана, приглушённым текстом', () => {
        const tab = fs.readFileSync(path.join(__dirname, 'DialogAnalysisTab.jsx'), 'utf8');
        expect(tab).not.toMatch(/turn\.text \|\| '—'/);
        expect(UNRECOGNIZED_TURN_TEXT).toBe('Речь не распознана');
        expect(block('.turnText[data-empty="true"]')).toMatch(/color: var\(--dlg-muted\);/);
    });
});
