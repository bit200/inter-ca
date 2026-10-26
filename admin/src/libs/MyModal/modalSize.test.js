const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, 'myModal.css'), 'utf8');
const quiz = fs.readFileSync(path.join(__dirname, '../../comps/Suggest/CourseQuiz.js'), 'utf8');

const maxWidth = (cls) => {
  const m = css.match(new RegExp('\\.modal-size-' + cls + '\\s*\\{[^}]*max-width:\\s*(\\d+)px'));
  return m && +m[1];
};

describe('ширина модального окна задач курса', () => {
  test('xl шире lg ровно на 20%', () => {
    expect(maxWidth('xl')).toBe(Math.round(maxWidth('lg') * 1.2));
  });

  test('окно задач курса использует размер xl', () => {
    expect(quiz).toMatch(/woClose=\{true\}\s*size=\{'xl'\}/);
  });
});
