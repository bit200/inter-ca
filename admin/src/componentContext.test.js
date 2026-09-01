const fs = require('fs');
const path = require('path');

// Регулярка из require.context в App.js: по ней webpack решает, какие файлы
// из ./comps попадут в бандл админки.
function componentPattern() {
    const src = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
    const m = src.match(/require\.context\("\.\/comps",\s*true,\s*(\/.*\/)\)/);
    if (!m) throw new Error('в App.js не найден require.context("./comps", ...)');

    const body = m[1].slice(1, m[1].lastIndexOf('/'));
    return new RegExp(body);
}

describe('require.context компонентов админки', () => {
    const re = componentPattern();

    it('берёт обычные компоненты', () => {
        expect(re.test('./RunExam/RunExam.js')).toBe(true);
        expect(re.test('./TrainMethods/AudioShort/AudioShort.jsx')).toBe(true);
        expect(re.test('./Courses/Courses.js')).toBe(true);
    });

    it('не тянет в бандл юнит-тесты рядом с компонентами', () => {
        expect(re.test('./TrainMethods/AudioShort/silenceCheck.test.js')).toBe(false);
        expect(re.test('./EvaluationDetail/components/scoreColor.test.js')).toBe(false);
        expect(re.test('./RunExam/RunExamInterviewStep.spec.jsx')).toBe(false);
        expect(re.test('./RunExam/__tests__/helpers.js')).toBe(false);
    });

    it('файлы, чьё имя лишь похоже на тест, остаются', () => {
        expect(re.test('./MockInterview/testUtilsPanel.js')).toBe(true);
        expect(re.test('./Tests/Tests.js')).toBe(true);
    });
});
