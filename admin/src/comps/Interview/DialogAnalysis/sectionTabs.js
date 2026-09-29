// Разделы разбора интервью: «Обзор» - все оцениваемые вопросы, «Техника» и
// «Софт» - тот же обзор, но только технические или только нетехнические
// вопросы, «Диалог» - лента. Выбранный раздел запоминается в браузере.

export const SECTION_KEY = 'dlgSection';

export const QUESTION_SECTIONS = {
    overview: {label: 'Обзор', title: 'Вопросы'},
    tech: {label: 'Техника', title: 'Технические вопросы', empty: 'Технических вопросов в интервью нет'},
    soft: {label: 'Софт', title: 'Нетехнические вопросы', empty: 'Нетехнических вопросов в интервью нет'},
};

export const SECTIONS = ['overview', 'tech', 'soft', 'dialog'];

export function isQuestionSection(section) {
    return Boolean(QUESTION_SECTIONS[section]);
}

// Вопросы раздела: «Техника» - technical === true, «Софт» - technical === false.
export function sectionBlocks(section, blocks) {
    let list = blocks || [];
    if (section === 'tech') return list.filter(block => block.technical === true);
    if (section === 'soft') return list.filter(block => block.technical === false);
    return list;
}

// Раздел, который можно открыть: пустые «Техника»/«Софт» выключены, и
// запомненный такой раздел уступает «Обзору» (или «Диалогу», если вопросов нет
// вовсе). «Обзор» и «Диалог» открываются всегда.
export function resolveSection(section, blocks) {
    let list = blocks || [];
    if (section === 'dialog' || section === 'overview') return section;
    if (isQuestionSection(section) && sectionBlocks(section, list).length > 0) return section;
    return list.length > 0 ? 'overview' : 'dialog';
}

// Раздел при открытии карточки: запомненный, иначе «Обзор», если есть вопросы.
export function initialSection(saved, blocks) {
    return saved || ((blocks || []).length > 0 ? 'overview' : 'dialog');
}

export function readSection(storage) {
    try {
        let value = (storage || window.localStorage).getItem(SECTION_KEY);
        return SECTIONS.includes(value) ? value : null;
    } catch (e) {
        return null;
    }
}

export function saveSection(section, storage) {
    try {
        (storage || window.localStorage).setItem(SECTION_KEY, section);
    } catch (e) {}
}
