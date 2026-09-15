// Разбор перетаскивания файла на дропзону страницы загрузки видео.

// Тащат ли над зоной именно файлы (а не текст/ссылку со страницы)
export function isFileDrag(dataTransfer) {
    let types = Array.from((dataTransfer && dataTransfer.types) || []);
    return types.includes('Files');
}

// Какой файл брать из drop: первый видеофайл, иначе первый файл без типа
// (некоторые ОС не проставляют mime у .mkv/.mov). Не видео -> null.
export function pickDroppedFile(dataTransfer) {
    let files = Array.from((dataTransfer && dataTransfer.files) || []);
    return files.find((f) => /^video\//.test(f.type || ''))
        || files.find((f) => !f.type)
        || null;
}
