import {useEffect, useState} from 'react';

// Веса балла нетехнического ответа. Правятся в админке на странице «Веса оценки»
// (раздел «Нетехническая оценка»), сюда приходят через GET /soft-score-weights.
// Дефолты - те же числа, что на сервере: пока веса не загрузились или запрос
// упал, балл считается как раньше.
//   content, delivery - доли «Содержания» и «Подачи» в балле ответа;
//   on_topic, evasive, complete, engaged - очки за отметки «Содержания»;
//   fillers, disfluencies, delay, inner_pauses - наибольший штраф «Подачи» за вид сбоев;
//   overall - вес нетехнической части рядом с технической в итоге интервью.
export const DEFAULT_SOFT_WEIGHTS = Object.freeze({
    content: 0.7, delivery: 0.3,
    on_topic: 6, evasive: 3, complete: 3, engaged: 1,
    fillers: 6, disfluencies: 3, delay: 2, inner_pauses: 2,
    overall: 0.6,
});

// Ответ сервера - {items: [{key, value}]}; берём только известные ключи и
// неотрицательные числа, остальное - дефолт.
export function normalizeSoftWeights(items) {
    let weights = {...DEFAULT_SOFT_WEIGHTS};
    (Array.isArray(items) ? items : []).forEach(item => {
        if (!item || !(item.key in DEFAULT_SOFT_WEIGHTS)) return;
        let value = Number(item.value);
        if (item.value !== null && item.value !== '' && Number.isFinite(value) && value >= 0) weights[item.key] = value;
    });
    return Object.freeze(weights);
}

let current = DEFAULT_SOFT_WEIGHTS;
let request = null;

export function getSoftWeights() {
    return current;
}

export function setSoftWeights(weights) {
    current = weights || DEFAULT_SOFT_WEIGHTS;
}

// Веса общие на весь кабинет: один запрос на все экраны. Сбой - остаёмся на
// дефолтах, следующий экран попробует ещё раз.
export function loadSoftWeights() {
    if (!global.http) return Promise.resolve(current);
    if (!request) {
        request = global.http.get('/soft-score-weights', {}, {wo_notify: true})
            .then(response => {
                current = normalizeSoftWeights(response && response.items);
                return current;
            })
            .catch(() => {
                request = null;
                return current;
            });
    }
    return request;
}

export function resetSoftWeights() {
    current = DEFAULT_SOFT_WEIGHTS;
    request = null;
}

// Текущие веса для экрана: сразу то, что уже есть, и перерисовка, когда
// загрузятся настоящие.
export function useSoftWeights() {
    let [weights, setWeights] = useState(current);
    useEffect(() => {
        let alive = true;
        loadSoftWeights().then(value => alive && setWeights(value));
        return () => { alive = false; };
    }, []);
    return weights;
}
