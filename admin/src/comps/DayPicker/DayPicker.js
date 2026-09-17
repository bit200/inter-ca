import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {WEEKDAYS, monthGrid, monthTitle} from './dayPickerGrid';
import {placePopup} from './dayPickerPlace';
import {
    DAY_PRESETS,
    RANGE_PRESETS,
    dayLabel,
    dayState,
    detectPreset,
    pickDay,
    presetName,
    rangeLabel,
    resolvePreset,
    shiftRange,
    toRange,
} from './dayPickerModel';
import './dayPicker.css';

// Выбор периода одним элементом: поле показывает отрезок словами, стрелки по
// бокам переводят его на такой же отрезок назад и вперёд, а всё остальное —
// готовые дни, готовые отрезки и календарь — лежит в одном раскрывающемся окне.
//
// Заменил <input type="date">: у браузерного поля соседний день стоит трёх
// действий (открыть, найти число, нажать), а «вчера» — самый частый запрос
// дежурного экрана. Отрезки добавлены следом: тот же экран смотрят не только
// посменно, но и «как отработала неделя».
//
// Режим single — тот же селектор, но про одни сутки: им набрано поле даты
// Smart-формы (libs/Smart/DateField.js), где отрезок бессмысленен. Отличий
// ровно три: клик по числу сразу ставит день, готовых отрезков в окне нет,
// а наружу уходит строка YYYY-MM-DD вместо {from, to}.
//
// Режим со временем (проп time/onTime) — для полей, где встреча назначается на
// час, а не на сутки: время стоит в том же окне под числами, поэтому дату и час
// задают одним заходом, а не двумя полями подряд. В таком режиме клик по числу
// окно не закрывает — иначе время выбрать уже негде; закрывает кнопка «Готово»,
// клик мимо и Esc. Боковые стрелки «день назад / день вперёд» отключаются
// пропом steps: в форме они места не стоят, а в узкой колонке съедали ширину у
// самой даты.
//
// Окно календаря живёт не рядом с полем, а на body (портал) и позиционируется
// fixed-координатами от поля. Внутри формы оно оставалось в потоке модалки: та
// прокручивается и обрезает всё, что вылезло за её край, — календарь в
// «Добавить трату» показывался наполовину и заезжал на соседние поля. На body
// его не режет ни один контейнер, а координаты считает placePopup: левый край —
// по полю, вниз, а если снизу места нет — вверх.

// Время — двумя списками «часы : минуты», а не браузерным <input type="time">.
// Браузер рисует его по своей локали, и у половины сотрудников поле показывало
// 12-часовую шкалу с AM/PM: назначенная «на 2» встреча читалась то как два часа
// дня, то как два ночи. Списки говорят на одном языке у всех — часы 00–23,
// минуты шагом в пять. Нестандартную минуту (встречу перенесли на 14:07)
// список не выбрасывает, а добавляет к себе: правка часа не должна молча
// сдвигать время, которого человек не трогал.
const HOURS = Array.from({length: 24}, (_, i) => (i < 10 ? '0' : '') + i);
const MINUTES = Array.from({length: 12}, (_, i) => (i * 5 < 10 ? '0' : '') + i * 5);

function hhmm(value) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
    if (!m) return {h: '12', m: '00'};
    const h = Math.min(23, Math.max(0, Number(m[1])));
    return {h: (h < 10 ? '0' : '') + h, m: m[2]};
}

function minuteOptions(current) {
    return MINUTES.indexOf(current) >= 0 ? MINUTES : MINUTES.concat([current]).sort();
}

function baseMonth(value, today) {
    const range = toRange(value);
    const d = range.from ? new Date(range.from) : today;
    const safe = isNaN(d.getTime()) ? today : d;
    return {year: safe.getFullYear(), month: safe.getMonth()};
}

function DayPicker({value, onChange, ariaLabel, clearable = false, wide = false, single = false, steps = true, time, onTime}) {
    const withTime = typeof time === 'string' && !!onTime;
    const [open, setOpen] = useState(false);
    const today = useMemo(() => new Date(), []);
    const [view, setView] = useState(() => baseMonth(value, today));
    const box = useRef(null);
    const control = useRef(null);
    const pop = useRef(null);
    const [place, setPlace] = useState(null);

    // Пересчёт координат окна: при открытии, при прокрутке под ним и при смене
    // размера экрана. Окно висит на body, поэтому за полем оно само не поедет.
    const relocate = useCallback(() => {
        const el = control.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const node = pop.current;
        setPlace(placePopup(rect, {width: window.innerWidth, height: window.innerHeight}, {
            width: node ? node.offsetWidth : 288,
            height: node ? node.offsetHeight : 300,
        }));
    }, []);

    // Первый проход считает по запасной высоте, второй — по настоящей: до
    // отрисовки окна её неоткуда взять, а от неё зависит переворот вверх.
    useLayoutEffect(() => {
        if (!open) {
            setPlace(null);
            return undefined;
        }
        relocate();
        const raf = requestAnimationFrame(relocate);
        window.addEventListener('resize', relocate);
        // capture — прокрутка идёт внутри модалки, а не у окна браузера.
        window.addEventListener('scroll', relocate, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', relocate);
            window.removeEventListener('scroll', relocate, true);
        };
    }, [open, relocate]);

    // Окно перекрывает шапку под собой — закрываем кликом мимо и по Esc, как
    // это уже сделано у календаря периода. Само окно теперь вне блока поля,
    // поэтому «мимо» проверяем по обоим.
    useEffect(() => {
        if (!open) return undefined;
        const onDocClick = (e) => {
            const inField = box.current && box.current.contains(e.target);
            const inPop = pop.current && pop.current.contains(e.target);
            if (!inField && !inPop) setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // Наружу уходит то, чем поле живёт: у периода — отрезок, у одиночного дня —
    // строка. Форме не приходится разбирать объект, чтобы записать дату.
    function set(range) {
        if (!onChange) return;
        onChange(single ? (range && range.from) || null : range);
    }

    function toggleOpen() {
        if (!open) setView(baseMonth(value, today));
        setOpen(!open);
    }

    function step(delta) {
        const next = shiftRange(value, delta);
        setView(baseMonth(next, today));
        set(next);
    }

    function usePreset(id) {
        const next = resolvePreset(id, today);
        setView(baseMonth(next, today));
        set(next);
        setOpen(false);
    }

    function shiftMonth(delta) {
        const d = new Date(view.year, view.month + delta, 1);
        setView({year: d.getFullYear(), month: d.getMonth()});
    }

    // Клик по числу: первый ставит начало, второй закрывает период и окно —
    // свой период заканчивается тем же нажатием, которым задан.
    function clickDay(day) {
        if (single) {
            set({from: day, to: day});
            // Со временем окно остаётся открытым: следующий шаг — час встречи.
            if (!withTime) setOpen(false);
            return;
        }
        const next = pickDay(value, day);
        set(next);
        if (next.from && next.to) setOpen(false);
    }

    const weeks = useMemo(() => monthGrid(view.year, view.month), [view.year, view.month]);
    const range = toRange(value);
    const preset = detectPreset(value, today);
    const name = presetName(value, today);
    const half = !!range.from && !range.to;

    function tab(it) {
        return <button
            key={it._id}
            type={'button'}
            className={'dp_tab' + (preset === it._id ? ' dp_tab_on' : '')}
            aria-pressed={preset === it._id}
            onClick={() => usePreset(it._id)}>{it.name}</button>
    }

    return <div className={'dp' + (wide ? ' dp_wide' : '')} ref={box}>
        {steps && <button type={'button'} className={'dp_step'}
                aria-label={single ? 'Предыдущий день' : 'Предыдущий период'}
                onClick={() => step(-1)}><i className={'iconoir-nav-arrow-left'}/></button>}

        <div
            ref={control}
            className={'dp_control' + (open ? ' dp_control_open' : '')}
            tabIndex={0}
            role={'button'}
            aria-label={ariaLabel || (single ? 'День' : 'Период')}
            aria-expanded={open}
            onClick={toggleOpen}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleOpen();
                }
            }}>
            <i className={'iconoir-calendar dp_ico'}/>
            <span className={'dp_label'}>
                {single ? dayLabel(value, today) : rangeLabel(value, today)}
            </span>
            {/* Время стоит в поле рядом с датой: назначенный час — половина
                ответа на вопрос «когда», и прятать его в окне нельзя. */}
            {withTime && range.from && <span className={'dp_at'}>{time || '--:--'}</span>}
            {name && <span className={'dp_tag'}>{name}</span>}
            {/* Необязательную дату нужно уметь убрать: в формах есть поля, где
                пустая дата — это ответ («ещё не закрыто»), а не пропуск ввода. */}
            {clearable && range.from && <button
                type={'button'} className={'dp_clear'} aria-label={'Убрать дату'}
                onClick={(e) => {
                    e.stopPropagation();
                    set(null);
                    setOpen(false);
                }}><i className={'iconoir-xmark'}/></button>}
            <i className={'dp_caret ' + (open ? 'iconoir-nav-arrow-up' : 'iconoir-nav-arrow-down')}/>
        </div>

        {steps && <button type={'button'} className={'dp_step'}
                aria-label={single ? 'Следующий день' : 'Следующий период'}
                onClick={() => step(1)}><i className={'iconoir-nav-arrow-right'}/></button>}

        {open && createPortal(<div
            ref={pop}
            className={'dp_pop' + (place && place.flip ? ' dp_pop_up' : '')}
            style={{
                left: place ? place.left : 0,
                top: place ? place.top : 0,
                // До первого замера окно уже в DOM (иначе нечего мерить), но
                // показывать его в углу экрана нельзя — ждём координат.
                visibility: place ? 'visible' : 'hidden',
            }}>
            {/* Два ряда, а не один общий: сутки и закрытые отрезки — разные
                вопросы к экрану («что сейчас в поле» и «как отработали»), и
                смешанный ряд из шести кнопок читался бы как одна шкала. */}
            <div className={'dp_presets'} role={'group'} aria-label={'Готовые дни'}>
                {DAY_PRESETS.map(tab)}
            </div>
            {!single && <div className={'dp_presets dp_presets_wide'} role={'group'}
                             aria-label={'Готовые отрезки'}>
                {RANGE_PRESETS.map(tab)}
            </div>}

            <div className={'dp_nav'}>
                <button type={'button'} className={'dp_arrow'} aria-label={'Предыдущий месяц'}
                        onClick={() => shiftMonth(-1)}><i className={'iconoir-nav-arrow-left'}/></button>
                <span className={'dp_month'}>{monthTitle(view.year, view.month)}</span>
                <button type={'button'} className={'dp_arrow'} aria-label={'Следующий месяц'}
                        onClick={() => shiftMonth(1)}><i className={'iconoir-nav-arrow-right'}/></button>
            </div>

            <div className={'dp_grid'}>
                {WEEKDAYS.map(w => <span key={w} className={'dp_wd'}>{w}</span>)}
                {weeks.map((week, wi) => week.map(d => {
                    const st = dayState(value, d.value, today);
                    const cls = 'dp_day'
                        + (d.out ? ' dp_day_out' : '')
                        + (st.inside ? ' dp_day_in' : '')
                        + (st.from || st.to ? ' dp_day_on' : '')
                        + (st.today ? ' dp_day_today' : '');
                    return <button
                        key={wi + '_' + d.value}
                        type={'button'}
                        className={cls}
                        aria-pressed={st.from || st.to || st.inside}
                        onClick={() => clickDay(d.value)}>{d.day}</button>
                }))}
            </div>

            {withTime && <div className={'dp_time'}>
                <i className={'iconoir-clock dp_time_ico'}/>
                <select
                    className={'dp_time_part'}
                    aria-label={'Часы'}
                    value={hhmm(time).h}
                    onChange={(e) => onTime(e.target.value + ':' + hhmm(time).m)}>
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className={'dp_time_colon'}>:</span>
                <select
                    className={'dp_time_part'}
                    aria-label={'Минуты'}
                    value={hhmm(time).m}
                    onChange={(e) => onTime(hhmm(time).h + ':' + e.target.value)}>
                    {minuteOptions(hhmm(time).m).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button type={'button'} className={'dp_time_done'}
                        onClick={() => setOpen(false)}>Готово</button>
            </div>}

            {/* Подсказка только на середине выбора: пока период не начат, она
                объясняла бы то, чего человек не делает. */}
            {!single && <div className={'dp_hint'}>
                {half ? 'Выберите конец периода' : 'Два клика по числам — свой период'}
            </div>}
        </div>, document.body)}
    </div>
}

export default DayPicker;
