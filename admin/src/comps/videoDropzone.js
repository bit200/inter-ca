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

// Показывать ли дропзону загрузки записи на карточке интервью: если ссылка
// на видео уже вписана руками (поле «Видео ссылка»), запись есть и звать
// загружать её ещё раз незачем.
export function shouldShowVideoDropzone({stage, videoLink} = {}) {
    if (stage !== '' && stage !== 'error' && stage !== undefined) return false;
    return !String(videoLink || '').trim();
}

// Показывать ли поле «Видео ссылка»: запись уже загружена файлом
// (Interview.videoUpload), а ссылка пустая - поле лишнее, прячем.
// Вписанную ссылку не прячем, чтобы её можно было поправить или стереть.
export function shouldShowVideoLinkInput({videoUpload, video} = {}) {
    if (String(video || '').trim()) return true;
    return !videoUpload;
}
