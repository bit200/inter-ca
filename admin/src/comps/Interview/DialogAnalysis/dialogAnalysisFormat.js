// Подписи и форматирование разбора диалога. Порт чистых функций из
// voice-manager (web-ui-script.ts): сам разбор приходит в тех же терминах -
// роли, маркеры, эмоции, акустические события, - и переводить их надо так же,
// иначе один и тот же звонок в двух кабинетах называется по-разному.

const ROLE_LABELS = {manager: 'Интервьюер', client: 'Кандидат'};

const MARKER_LABELS = {
    filler: 'Слово-паразит',
    uncertainty: 'Неуверенность',
    rudeness: 'Грубость',
    profanity: 'Ненормативная речь',
    empathy: 'Эмпатия',
    apology: 'Извинение',
    interruption: 'Перебивание',
};

const EVENT_LABELS = {
    music: 'Музыка',
    music_tv: 'Музыка или ТВ',
    television: 'Телевизор',
    child: 'Ребёнок',
    dog: 'Собака',
    keyboard: 'Клавиатура',
    notification: 'Уведомление',
    traffic: 'Транспорт',
    secondary_speech: 'Посторонняя речь',
    room_noise: 'Фоновый шум',
    voice: 'Посторонняя речь',
};

const EMOTION_LABELS = {
    neutral: 'Нейтрально',
    angry: 'Злость',
    positive: 'Позитив',
    sad: 'Грусть',
    stressed: 'Напряжение',
    uncertain: 'Неуверенность',
    enthusiasm: 'Воодушевление',
    fear: 'Страх',
    disgust: 'Отвращение',
    other: 'Другое',
    monoton: 'Монотонность',
    excited: 'Возбуждение',
};

const CAPABILITY_LABELS = {
    diarization: 'Разделение говорящих',
    speakerIdentification: 'Сопоставление участника',
    managerVoiceIsolation: 'Изоляция интервьюера',
    technicalQuality: 'Техническое качество',
    noiseEvents: 'Остаточный шум',
    speechMetrics: 'Речевые метрики',
    emotionModel: 'Эмоции',
    emotionProsody: 'Просодия',
    acousticEvents: 'Акустические события',
};

const CAPABILITY_STATUS_LABELS = {
    ready: 'Получено',
    degraded: 'Ограничено',
    unavailable: 'Недоступно',
    not_applicable: 'Не применяется',
    partial: 'Частично',
};

// Роли в разборе называются по-разному в зависимости от источника дорожек,
// поэтому сводим их к двум своим, а всё непонятное оставляем «неизвестным».
export function normalizedRole(role) {
    let value = String(role || 'unknown').toLowerCase();
    if (value === 'manager' || value === 'our' || value === 'near_end' || value === 'interviewer') return 'manager';
    if (value === 'client' || value === 'external' || value === 'far_end' || value === 'candidate') return 'client';
    return 'unknown';
}

export function speakerLabel(role, speaker) {
    let normalized = normalizedRole(role);
    if (ROLE_LABELS[normalized]) return ROLE_LABELS[normalized];
    return speaker && speaker !== 'unknown' ? String(speaker) : 'Говорящий';
}

export function roleSummary(turns) {
    let roles = new Set((turns || []).map(turn => normalizedRole(turn && turn.role)));
    if (roles.has('manager') && roles.has('client')) return 'Определены';
    return roles.size === 1 && roles.has('unknown') ? 'Не определены' : 'Частично';
}

// Счётчик у заголовка расшифровки: «1 реплика», «3 реплики», «8 реплик».
export function turnsCountLabel(count) {
    let n = Math.max(0, Math.floor(Number(count) || 0));
    let tens = n % 100, ones = n % 10;
    let word = tens >= 11 && tens <= 14 ? 'реплик' : ones === 1 ? 'реплика' : ones >= 2 && ones <= 4 ? 'реплики' : 'реплик';
    return n + ' ' + word;
}

// Отрезок речи, в котором распознавание не нашло ни одного слова: диаризация
// услышала голос (обычно короткое «угу», вдох, шум или перебивание), а ASR
// текста не вернул. Это не низкая уверенность - текста нет вовсе.
export function isUnrecognizedTurn(turn) {
    let text = turn && typeof turn.text === 'string' ? turn.text.trim() : '';
    return !text;
}

export const UNRECOGNIZED_TURN_TEXT = 'Речь не распознана';
export const UNRECOGNIZED_TURN_HINT = 'На этом отрезке слышен голос, но распознавание не нашло ни одного слова: '
    + 'обычно это короткое «угу», шум или перебивание. Послушайте запись, чтобы понять, что сказано.';

// Время реплики диапазоном, как в карточке звонка: «0:01–0:04». Реплика без
// конца или короче секунды показывается одним моментом.
export function turnTimeRange(turn) {
    let start = Math.max(0, Number(turn && turn.startMs) || 0);
    let end = Number(turn && turn.endMs);
    let from = formatDuration(start);
    let to = Number.isFinite(end) && end > start ? formatDuration(end) : from;
    return from === to ? {from, to: null} : {from, to};
}

export function markerLabel(category) {
    return MARKER_LABELS[category] || category || 'Маркер';
}

export function eventLabel(type, fallback) {
    return EVENT_LABELS[type] || fallback || type || 'Событие';
}

export function emotionLabel(value) {
    return EMOTION_LABELS[value] || value || 'Не определена';
}

export function capabilityLabel(key) {
    return CAPABILITY_LABELS[key] || key;
}

export function capabilityStatusLabel(status) {
    return CAPABILITY_STATUS_LABELS[status] || status || 'Получено';
}

// Акустика и качество записи приходят в разборе, только если конвейер их
// заказывал. Разбор интервью сейчас их не заказывает (только ASR, диаризация
// и таймлайн), поэтому без данных блоки не показываем вовсе - иначе это
// вечные пустые заглушки.
export function hasRecordingSignals(capabilities) {
    let value = capabilities && typeof capabilities === 'object' ? capabilities : {};
    let events = value.acousticEvents && Array.isArray(value.acousticEvents.events) ? value.acousticEvents.events : [];
    if (events.length) return true;
    let snr = value.technicalQuality && value.technicalQuality.snr;
    if (snr && typeof snr.estimatedDb === 'number') return true;
    return Object.keys(value).some(key => key !== 'acousticEvents'
        && value[key] && typeof value[key] === 'object' && value[key].status);
}

export function formatDuration(milliseconds) {
    let total = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

export function formatSeconds(value) {
    return formatDuration(Number(value || 0) * 1000);
}

export function formatPercent(value) {
    return Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100) + '%';
}

export function formatNumber(value, digits) {
    return Number(value).toFixed(digits).replace('-', '−').replace('.', ',');
}

export function formatDb(value) {
    return formatNumber(value, 1) + ' дБ';
}

export function formatDbfs(value) {
    return formatNumber(value, 1) + ' дБFS';
}

// Верхние вероятности источника одной строкой: три класса читаются, десять - нет.
// Главный класс из строки убираем - он уже назван рядом, и повтор читается
// как два разных вывода.
export function emotionDistribution(summary, options) {
    let probabilities = summary && typeof summary.probabilities === 'object' ? summary.probabilities : {};
    let skip = options && options.exclude ? options.exclude : (summary && summary.dominant);
    return Object.keys(probabilities)
        .filter(name => typeof probabilities[name] === 'number' && name !== skip)
        .sort((left, right) => probabilities[right] - probabilities[left])
        .slice(0, 3)
        .map(name => emotionLabel(name) + ' ' + formatPercent(probabilities[name]))
        .join(' · ') || 'Недостаточно данных';
}

export function emotionDominant(summary) {
    if (!summary || !summary.dominant) return 'Нет вывода';
    let probability = typeof summary.dominantProbability === 'number'
        ? ' · ' + formatPercent(summary.dominantProbability)
        : '';
    return emotionLabel(summary.dominant) + probability;
}

const SENTENCE_END = /[.?!…]["»)]*$/;

// Текст реплики вычищен распознаванием лучше, чем слова по отдельности, поэтому
// ушедшие слова срезаем с краёв самого текста. Не сошлось - собираем из слов.
function trimTurnText(text, all, kept) {
    let joined = kept.map(word => String(word.text || '').trim()).filter(Boolean).join(' ');
    let source = String(text || '');
    let first = all.indexOf(kept[0]);
    let last = all.indexOf(kept[kept.length - 1]);
    let head = all.slice(0, first);
    let tail = all.slice(last + 1).reverse();
    let squash = value => value.replace(/\s+/g, '').toLowerCase();
    let from = 0;
    for (let word of head) {
        let piece = squash(String(word.text || ''));
        let rest = source.slice(from);
        let skipped = rest.length - rest.trimStart().length;
        if (!squash(rest.slice(skipped, skipped + piece.length * 2)).startsWith(piece)) return joined;
        let consumed = 0;
        let position = from + skipped;
        while (consumed < piece.length && position < source.length) {
            if (!/\s/.test(source[position])) consumed += 1;
            position += 1;
        }
        from = position;
    }
    let to = source.length;
    for (let word of tail) {
        let piece = squash(String(word.text || ''));
        let rest = source.slice(from, to).trimEnd();
        if (!squash(rest.slice(-piece.length * 2)).endsWith(piece)) return joined;
        let consumed = 0;
        let position = from + rest.length;
        while (consumed < piece.length && position > from) {
            position -= 1;
            if (!/\s/.test(source[position])) consumed += 1;
        }
        to = position;
    }
    return source.slice(from, to).trim() || joined;
}

// Распознавание кладёт слова на стыке двух голосов в обе реплики сразу (тот же
// id слова): хвост ответа кандидата повторяется началом реплики интервьюера.
// Каждое слово оставляем одной реплике. Реплика, целиком собранная из чужих
// слов, - эхо длинной соседней, её убираем. Общий кусок двух настоящих реплик
// режем по концу предложения: законченная фраза - хвост ранней, остальное -
// начало поздней.
export function separateSharedWords(turns) {
    let wordsOf = turn => (turn && Array.isArray(turn.words) ? turn.words : []);
    let owners = new Map();
    turns.forEach((turn, index) => wordsOf(turn).forEach(word => {
        if (!word || word.id == null) return;
        if (!owners.has(word.id)) owners.set(word.id, []);
        let list = owners.get(word.id);
        if (list[list.length - 1] !== index) list.push(index);
    }));
    let shared = id => (owners.get(id) || []).length > 1;
    if (!turns.some(turn => wordsOf(turn).some(word => word && shared(word.id)))) return turns;

    let isEcho = index => {
        let words = wordsOf(turns[index]);
        return words.length > 0 && words.every(word => word && word.id != null
            && owners.get(word.id).some(other => other !== index && wordsOf(turns[other]).length > words.length));
    };
    let dropped = new Set(turns.map((turn, index) => index).filter(isEcho));

    let removed = turns.map(() => new Set());
    let order = turns.map((turn, index) => index)
        .filter(index => !dropped.has(index))
        .sort((left, right) => Number(turns[left].startMs || 0) - Number(turns[right].startMs || 0) || left - right);
    order.forEach((earlier, position) => {
        order.slice(position + 1).forEach(later => {
            let laterIds = new Set(wordsOf(turns[later]).map(word => word && word.id));
            let common = wordsOf(turns[earlier]).filter(word => word && word.id != null && laterIds.has(word.id)
                && !removed[earlier].has(word.id) && !removed[later].has(word.id));
            if (!common.length) return;
            let cut = -1;
            common.forEach((word, index) => { if (SENTENCE_END.test(String(word.text || '').trim())) cut = index; });
            common.forEach((word, index) => removed[index <= cut ? later : earlier].add(word.id));
        });
    });

    return turns.flatMap((turn, index) => {
        if (dropped.has(index)) return [];
        if (!removed[index].size) return [turn];
        let words = wordsOf(turn).filter(word => !(word && removed[index].has(word.id)));
        if (!words.length) return [];
        let all = wordsOf(turn);
        let next = {...turn, words, text: trimTurnText(turn.text, all, words)};
        // Время реплики сдвигаем только с того края, откуда ушли слова.
        if (words[0] !== all[0] && words[0].startMs != null) next.startMs = Math.max(Number(turn.startMs || 0), Number(words[0].startMs));
        let last = words[words.length - 1];
        if (last !== all[all.length - 1] && last.endMs != null && turn.endMs != null) next.endMs = Math.min(Number(turn.endMs), Number(last.endMs));
        return [next];
    });
}

// Реплики достаём терпимо: разбор может лежать и плоско (result.turns),
// и внутри conversation - на бэкенде форма ещё устаканивается.
export function readConversation(result) {
    let value = result && typeof result === 'object' ? result : {};
    let conversation = value.conversation && typeof value.conversation === 'object' ? value.conversation : value;
    return {
        turns: Array.isArray(conversation.turns) ? separateSharedWords(conversation.turns) : [],
        markers: Array.isArray(conversation.markers) ? conversation.markers : [],
        summary: conversation.summary && typeof conversation.summary === 'object' ? conversation.summary : {},
        capabilities: value.capabilities && typeof value.capabilities === 'object' ? value.capabilities : {},
    };
}

// Замечания оцениваем только по речи кандидата: у интервьюера это общие
// замечания, к оценке кандидата они не относятся. Роли берём уже с ручными правками.
export function candidateMarkers(turns, markers) {
    let ids = new Set();
    (turns || []).forEach(turn => {
        if (turn && normalizedRole(turn.role) === 'client' && Array.isArray(turn.markerIds)) turn.markerIds.forEach(id => ids.add(id));
    });
    return (markers || []).filter(marker => marker && ids.has(marker.id));
}

// Сколько раз встретился каждый вид замечания - это и есть краткий итог разбора.
export function markerCounts(markers) {
    let counts = new Map();
    (markers || []).forEach(marker => {
        let category = marker && marker.category;
        counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([category, count]) => ({category, count}));
}

// Ключ говорящего: диаризация даёт SPEAKER_00, SPEAKER_01, а если её не было -
// различать участников можно только по роли.
export function speakerKey(turn) {
    let speaker = turn && turn.speaker;
    if (speaker && speaker !== 'unknown') return String(speaker);
    return 'role:' + normalizedRole(turn && turn.role);
}

// Роль, которую человек назначил говорящему руками, сильнее автоматической:
// разбор угадывает интервьюера по дорожкам, а интервьюеров бывает несколько.
export function applySpeakerRoles(turns, roles) {
    let map = roles && typeof roles === 'object' ? roles : {};
    return (turns || []).map(turn => {
        let role = map[speakerKey(turn)];
        return role === 'client' || role === 'manager' ? {...turn, role} : turn;
    });
}

// Роли стали полными от ручной правки: до неё в записи не было кандидата или
// интервьюера, после - есть оба. Оценка ответов, посчитанная без одной из ролей,
// бессмысленна (0% речи, вопросы без ответов), поэтому её пора пересчитать.
export function rolesJustCompleted(turns, prevRoles, nextRoles) {
    let before = roleSummary(applySpeakerRoles(turns, prevRoles));
    let after = roleSummary(applySpeakerRoles(turns, nextRoles));
    return before !== 'Определены' && after === 'Определены';
}

// Участники записи для выбора роли: сколько реплик и сколько времени говорил
// каждый и с чего начал - по первой фразе человек узнаёт голос.
export function listSpeakers(turns) {
    let byKey = new Map();
    (turns || []).forEach(turn => {
        if (!turn) return;
        let key = speakerKey(turn);
        let entry = byKey.get(key);
        if (!entry) {
            entry = {key, speaker: turn.speaker, role: normalizedRole(turn.role), turns: 0, speechMs: 0, sample: ''};
            byKey.set(key, entry);
        }
        entry.turns += 1;
        entry.speechMs += Math.max(0, Number(turn.endMs || 0) - Number(turn.startMs || 0));
        if (!entry.sample && turn.text && String(turn.text).trim().length > 3) entry.sample = String(turn.text).trim();
    });
    return Array.from(byKey.values());
}

// Подпись говорящего в ленте. Если одну роль делят несколько голосов
// (два интервьюера), добавляем номер, иначе реплики разных людей сливаются.
export function speakerLabels(turns) {
    let speakers = listSpeakers(turns);
    let perRole = {};
    speakers.forEach(entry => { perRole[entry.role] = (perRole[entry.role] || 0) + 1; });
    let seen = {};
    let labels = {};
    speakers.forEach(entry => {
        let base = speakerLabel(entry.role, entry.speaker);
        seen[entry.role] = (seen[entry.role] || 0) + 1;
        labels[entry.key] = ROLE_LABELS[entry.role] && perRole[entry.role] > 1 ? base + ' ' + seen[entry.role] : base;
    });
    return labels;
}
