import fs from 'fs';
import path from 'path';
import {isFileDrag, pickDroppedFile, shouldShowVideoDropzone} from './videoDropzone';

const file = (name, type) => new File(['x'], name, {type});

describe('pickDroppedFile', () => {
    it('берёт первый видеофайл, пропуская остальные', () => {
        const mp4 = file('a.mp4', 'video/mp4');
        expect(pickDroppedFile({files: [file('a.txt', 'text/plain'), mp4, file('b.webm', 'video/webm')]})).toBe(mp4);
    });
    it('принимает файл без mime (mkv/mov на части ОС)', () => {
        const mkv = file('a.mkv', '');
        expect(pickDroppedFile({files: [file('a.png', 'image/png'), mkv]})).toBe(mkv);
    });
    it('не видео и пустой drop -> null', () => {
        expect(pickDroppedFile({files: [file('a.png', 'image/png')]})).toBeNull();
        expect(pickDroppedFile({files: []})).toBeNull();
        expect(pickDroppedFile(null)).toBeNull();
    });
});

describe('isFileDrag', () => {
    it('отличает перетаскивание файлов от текста', () => {
        expect(isFileDrag({types: ['Files']})).toBe(true);
        expect(isFileDrag({types: ['text/plain']})).toBe(false);
        expect(isFileDrag(undefined)).toBe(false);
    });
});

describe('UploadVideo', () => {
    it('зона выбора файла принимает drag-and-drop', () => {
        const src = fs.readFileSync(path.join(__dirname, 'UploadVideo.js'), 'utf8');
        expect(src).toMatch(/onDrop=\{/);
        expect(src).toMatch(/onDragOver=\{/);
        expect(src).toMatch(/pickDroppedFile\(/);
    });
});

describe('InterviewVideoUpload', () => {
    it('блок загрузки отделён отступами от соседних полей формы', () => {
        const css = fs.readFileSync(path.join(__dirname, 'Interview', 'Interview.css'), 'utf8');
        const rule = css.match(/\.interviewVideoUpload\s*\{([^}]*)\}/);
        expect(rule).not.toBeNull();
        expect(rule[1]).toMatch(/margin(-block)?\s*:\s*[1-9]/);
    });
});

describe('shouldShowVideoDropzone', () => {
    it('ссылка на видео уже есть -> дропзону не показываем', () => {
        expect(shouldShowVideoDropzone({stage: '', videoLink: 'https://drive.google.com/file/d/1'})).toBe(false);
        expect(shouldShowVideoDropzone({stage: 'error', videoLink: 'https://x'})).toBe(false);
    });
    it('ссылки нет -> показываем, пока не идёт загрузка', () => {
        expect(shouldShowVideoDropzone({stage: '', videoLink: ''})).toBe(true);
        expect(shouldShowVideoDropzone({stage: 'error', videoLink: '  '})).toBe(true);
        expect(shouldShowVideoDropzone({stage: 'upload'})).toBe(false);
    });
    it('карточка интервью передаёт ссылку в блок загрузки', () => {
        const src = fs.readFileSync(path.join(__dirname, 'Interview', 'Interview.js'), 'utf8');
        expect(src).toMatch(/videoLink=\{item\.video\}/);
    });
});
