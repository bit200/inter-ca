import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import UseLocalStorage from '../../libs/UseLocalStorage';
import styles from './evaluationList.module.scss'
import EvaluationListItemGroup from "./components/EvaluationListItemGroup";
import EvaluationListEmpty from "./components/EvaluationListEmpty";
import {groupItems, sortByDictationDate, SORT_MODES} from "./evaluate-list.utils";

const GROUPS_PAGE_SIZE = 25;
const ITEMS_PER_PAGE = 100;

const getGroupLabel = (groupMode, key) => groupMode === 'exam' ? `Экзамен #${key}` : key
const getExamId = (groupMode, key) => groupMode === 'exam' ? key : null;

// visibleCount only resets on a real tab switch (groupMode) - NOT on groups.length
// changing, which now also happens whenever loadMore() below appends another page.
// Resetting on every fetch would collapse groups the person already expanded just
// because more data quietly arrived.
const GroupList = ({groups, groupMode, sort, hasMore, loadingMore, onLoadMore, onSwitchMode}) => {
    const [visibleCount, setVisibleCount] = useState(GROUPS_PAGE_SIZE);

    useEffect(() => {
        setVisibleCount(GROUPS_PAGE_SIZE);
    }, [groupMode]);

    if(!groups.length){
        return <EvaluationListEmpty groupMode={groupMode} onSwitchMode={onSwitchMode}/>
    }

    const visibleGroups = groups.slice(0, visibleCount);
    const remainingLocal = groups.length - visibleGroups.length;

    // Two different "more" - groups already fetched but not rendered yet (instant),
    // vs more rows the server hasn't sent yet (a real request). Never both needed
    // in the same click: reveal what's already local first, only hit the network
    // once there's nothing local left to show.
    const handleShowMore = () => {
        if (remainingLocal > 0) {
            setVisibleCount(c => c + GROUPS_PAGE_SIZE);
        } else if (hasMore) {
            onLoadMore();
        }
    };

    return <>
        {visibleGroups.map(({ key, items: groupRows }) => (
            <EvaluationListItemGroup key={key} examId={getExamId(groupMode, key)} label={getGroupLabel(groupMode, key)} items={groupRows} groupMode={groupMode} sort={sort} />
        ))}
        {(remainingLocal > 0 || hasMore) && (
            <button type="button" className={`btn btn-light btn-sm ${styles.showMore}`} data-testid="evaluation-groups-show-more"
                    disabled={loadingMore}
                    onClick={handleShowMore}>
                {loadingMore ? 'Загрузка...' : remainingLocal > 0 ? `Показать ещё (${remainingLocal})` : 'Показать ещё'}
            </button>
        )}
    </>
}

// Сортировка - по дате диктовки, поэтому и подпись про ответы, а не про оценки:
// иначе "сначала новые" читается как "недавно оценённые". Стрелка справа от
// надписи - как у сортировок на остальных экранах.
const SortSwitch = ({ sortOrder, setSortOrder }) => (
    <button type="button" className="btn btn-sm btn-light"
            data-testid="evaluation-sort-date"
            title="Сортировка по дате ответа"
            onClick={() => setSortOrder(sortOrder === 'new' ? 'old' : 'new')}>
        {sortOrder === 'new' ? 'Сначала новые' : 'Сначала старые'}
        <i className={`iconoir-sort-${sortOrder === 'new' ? 'down' : 'up'} ${styles.sortIcon}`}/>
    </button>
)

// Тумблер по кругу: порядок как есть -> сначала высокие -> сначала низкие.
// Одна кнопка вместо пары стрелок: направление у сортировки всегда одно, и
// подпись прямо называет то, что человек увидит сверху списка.
const SORT_LABEL = { desc: 'Сначала высокие', asc: 'Сначала низкие' };
const SORT_ICON = { desc: 'iconoir-sort-down', asc: 'iconoir-sort-up' };
const NEXT_SORT = { none: 'desc', desc: 'asc', asc: 'none' };

const ScoreSort = ({ sort, setSort }) => {
    const active = SORT_MODES.includes(sort);
    return <button type="button" data-testid="evaluation-sort-score"
                   data-sort={active ? sort : 'none'}
                   title="Сортировать ответы по баллу"
                   onClick={() => setSort(NEXT_SORT[active ? sort : 'none'])}
                   className={'btn btn-sm ' + (active ? 'btn-outline-primary' : 'btn-light') + ' ' + styles.sortBtn}>
        <i className={active ? SORT_ICON[sort] : 'iconoir-sort'}/>
        {active ? SORT_LABEL[sort] : 'По оценке'}
    </button>
}

const GroupModeSwitch = ({ groupMode,  setGroupMode}) => {
    return <div>
        {['exam', 'module'].map(mode => (
            <button key={mode} onClick={() => setGroupMode(mode)}
                    data-testid={`evaluation-group-mode-${mode}`}
                    className={'btn btn-sm ' + (groupMode === mode ? 'btn-primary' : 'btn-light')}>
                {t(mode === 'exam' ? 'by_exam' : 'by_module')}
            </button>
        ))}
    </div>
}

function EvaluationList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    // total/done come from the server aggregate (whole matching set), not derived from
    // `items` - items only ever holds the pages fetched so far, so deriving from it would
    // make the header regress to a smaller number while more pages are still loading.
    const [stats, setStats] = useState({ total: 0, done: 0 });
    const [, setLastSeenDone] = UseLocalStorage('evaluateLastSeenDone', 0);
    // In the URL (?mode=), not component state - the module-detail screen links back
    // to /evaluations with this same param (see EvaluationListItemGroup/EvaluationDetail),
    // so both the in-app back link and the real browser back button land on the tab the
    // person was actually looking at, instead of always resetting to 'module'.
    const [searchParams, setSearchParams] = useSearchParams();
    const groupMode = searchParams.get('mode') === 'exam' ? 'exam' : 'module';
    const sortParam = searchParams.get('sort');
    const sort = SORT_MODES.includes(sortParam) ? sortParam : 'none';
    // Оба параметра пишем вместе: сортировка не должна слетать при смене вкладки,
    // а вкладка - при смене сортировки.
    const setParams = (next) => {
        const params = {};
        const mode = next.mode ?? groupMode;
        const nextSort = next.sort ?? sort;
        if (mode !== 'module') params.mode = mode;
        if (SORT_MODES.includes(nextSort)) params.sort = nextSort;
        setSearchParams(params);
    };
    const setGroupMode = (mode) => setParams({ mode });
    const setSort = (nextSort) => setParams({ sort: nextSort });
    // Дата задаёт базовый порядок ДО группировки - и строк, и самих групп
    // (группа со свежим ответом идёт первой). Сортировка по баллу включается
    // поверх и переставляет строки уже внутри группы, оставляя дату главной
    // для порядка групп и для строк с одинаковым баллом.
    const [sortOrder, setSortOrder] = useState('new');
    const groups = groupItems(sortByDictationDate(items, sortOrder), groupMode);
    const hasMore = items.length < stats.total;

    // groupMode is a server-side filter now (?mode=exam|module - QuizHistory.exam is only
    // ever set on exam answers, never on module ones, so it's an exact split) - switching
    // tabs means a different result set, not a client-side re-filter of the same one.
    useEffect(() => {
        setLoading(true);
        setItems([]);
        setPage(1);
        global.http.get('/evaluate-list', { mode: groupMode, page: 1, per_page: ITEMS_PER_PAGE })
            .then(data => {
                const { items: pageItems = [], total = 0, done = 0 } = data || {};
                setItems(pageItems);
                setStats({ total, done });
                setLastSeenDone(done);
            })
            .finally(() => setLoading(false));
    }, [groupMode]);

    const loadMore = () => {
        const nextPage = page + 1;
        setLoadingMore(true);
        global.http.get('/evaluate-list', { mode: groupMode, page: nextPage, per_page: ITEMS_PER_PAGE })
            .then(data => {
                const { items: pageItems = [], total = 0, done = 0 } = data || {};
                setItems(prev => [...prev, ...pageItems]);
                setStats({ total, done });
                setPage(nextPage);
            })
            .finally(() => setLoadingMore(false));
    };

    if (loading) {
        return <div className={styles.container}>Загрузка...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h4>Оценки ИИ</h4>
                <span>{stats.done}/{stats.total} оценено</span>
                <div className={`${styles.headerControls} ${styles.headerActions}`}>
                    <SortSwitch sortOrder={sortOrder} setSortOrder={setSortOrder} />
                    <ScoreSort sort={sort} setSort={setSort}/>
                    <GroupModeSwitch groupMode={groupMode} setGroupMode={setGroupMode} />
                </div>
            </div>
            <GroupList groupMode={groupMode} sort={sort} groups={groups} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} onSwitchMode={setGroupMode} />
        </div>
    );
}

export default EvaluationList;
