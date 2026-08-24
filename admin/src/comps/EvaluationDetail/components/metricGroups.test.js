import { buildGroupPercents, weakestGroup } from './metricGroups';

const schemas = [
    { key: 'evaluation.speech.clarity', group: 'Речь', min: 0, max: 10 },
    { key: 'evaluation.practice.count', group: 'Практика', min: 0, max: 10 },
];

describe('weakestGroup: слабое место в шапке', () => {
    it('называет группу с самым низким процентом', () => {
        const rows = buildGroupPercents(schemas, {
            evaluation: { speech: { clarity: 8 }, practice: { count: 3 } },
        });
        expect(weakestGroup(rows)).toMatchObject({ group: 'Практика', pct: 30 });
    });

    it('молчит, когда проседать нечему', () => {
        const rows = buildGroupPercents(schemas, {
            evaluation: { speech: { clarity: 9 }, practice: { count: 8 } },
        });
        expect(weakestGroup(rows)).toBe(null);
    });
});
