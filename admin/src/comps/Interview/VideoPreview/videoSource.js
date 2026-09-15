// Что можно сделать со ссылкой из поля «Видео» интервью. Тег <video> играет
// только сам файл. Ссылка на страницу хостинга (Google Диск, YouTube, Яндекс
// Диск) отдаёт HTML, и вместо записи человек видит пустой чёрный плеер, - такую
// ссылку не встраиваем, а предлагаем открыть там, где она живёт.

const PAGE_HOSTS = [
    {test: /(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/, name: 'на Google Диске'},
    {test: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/, name: 'на YouTube'},
    {test: /(^|\.)disk\.yandex\.[a-z]+$|(^|\.)yadi\.sk$/, name: 'на Яндекс Диске'},
    {test: /(^|\.)dropbox\.com$/, name: 'в Dropbox'},
    {test: /(^|\.)vimeo\.com$/, name: 'на Vimeo'},
    {test: /(^|\.)rutube\.ru$/, name: 'на Rutube'},
    {test: /(^|\.)loom\.com$/, name: 'в Loom'},
    {test: /(^|\.)cloud\.mail\.ru$/, name: 'в Облаке Mail.ru'},
    {test: /(^|\.)vk\.com$|(^|\.)vkvideo\.ru$/, name: 'в VK'},
    {test: /(^|\.)zoom\.us$/, name: 'в Zoom'},
];

const MEDIA_FILE = /\.(mp4|webm|ogv|ogg|mov|m4v|mkv|m3u8|mp3|m4a|wav)$/i;

export function readVideoSource(value) {
    let src = typeof value === 'string' ? value.trim() : '';
    if (!src) return null;

    let url;
    try {
        url = new URL(src, 'http://local.invalid');
    } catch (e) {
        return {kind: 'direct', src};
    }
    // Прямой файл узнаём по расширению: с любого хоста он играет в плеере.
    if (MEDIA_FILE.test(url.pathname)) return {kind: 'direct', src};

    let host = url.hostname.toLowerCase();
    let page = PAGE_HOSTS.find(item => item.test.test(host));
    if (page) return {kind: 'page', src, place: page.name};

    // Незнакомый адрес без расширения пробуем проиграть: если плеер не
    // справится, превью само покажет ссылку вместо чёрного прямоугольника.
    return {kind: 'direct', src};
}

// Короткая подпись адреса для человека: хост без www.
export function linkHost(src) {
    try {
        return new URL(src).hostname.replace(/^www\./, '');
    } catch (e) {
        return '';
    }
}
