// Проверка ответа на квиз/код-ревью на сервере (#4594, ручка /check-quiz-answer из #4592):
// клиент не должен знать правильные ответы, поэтому variations[].isCorrect и
// correctAnswers в данных могут отсутствовать.

// Тело answer для квиза: имена вариантов в показанном порядке и индексы выбранных.
export function quizAnswerPayload(quiz, selectedIndexes) {
    return {
        variations: (quiz?.variations || []).map(it => it.name),
        selected: selectedIndexes || [],
    };
}

// Локальный запасной вариант на случай, когда сервер недоступен, а isCorrect в данных ещё есть.
function localQuizCheck(quiz, selectedIndexes) {
    let variations = quiz?.variations || [];
    if (!variations.some(it => it.isCorrect)) {
        return null;
    }
    let correctIndexes = [];
    variations.forEach((it, ind) => it.isCorrect && correctIndexes.push(ind));
    let isCorrect = correctIndexes.length === selectedIndexes.length
        && correctIndexes.every(ind => selectedIndexes.includes(ind));
    return {isCorrect, correctIndexes};
}

// -> {isCorrect, correctIndexes}; при сбое сети без isCorrect в данных ответ не засчитывается.
export async function checkQuizOnServer(quiz, selectedIndexes) {
    try {
        let res = await global.http.post('/check-quiz-answer', {
            quiz: quiz?._id,
            answer: quizAnswerPayload(quiz, selectedIndexes),
        });
        if (res && typeof res.isCorrect === 'boolean') {
            return {isCorrect: res.isCorrect, correctIndexes: res.correctIndexes || []};
        }
    } catch (e) {
        console.error('check-quiz-answer failed', e);
    }
    return localQuizCheck(quiz, selectedIndexes) || {isCorrect: false, correctIndexes: []};
}

// Правильный ли вариант ind: по ответу сервера, а если его ещё нет — по данным квиза.
export function isCorrectVariant(variation, ind, correctIndexes) {
    if (correctIndexes) {
        return correctIndexes.includes(ind);
    }
    return Boolean(variation?.isCorrect);
}
