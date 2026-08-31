const fs = require('fs');
const path = require('path');

// Робот браузера (speechSynthesis) звучал плохо и убран совсем: вопрос
// озвучивается только заранее сгенерированным на бэкенде файлом.
describe('озвучка вопроса в App.js', () => {
    const src = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');

    it('не читает вопрос роботом браузера', () => {
        expect(src).not.toMatch(/SpeechSynthesisUtterance/);
        expect(src).not.toMatch(/speechSynthesis/);
    });

    it('играет заранее сгенерированный файл', () => {
        expect(src).toMatch(/playQuestionAudio\(\{text, quizId\}/);
    });
});
