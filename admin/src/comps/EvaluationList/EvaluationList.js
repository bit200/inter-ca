import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import UseLocalStorage from '../../libs/UseLocalStorage';
import styles from './evaluationList.module.scss'
import EvaluationListItemGroup from "./components/EvaluationListItemGroup";
import {groupItems} from "./evaluate-list.utils";

const getGroupLabel = (groupMode, key) => groupMode === 'exam' ? `Экзамен #${key}` : key
const getExamId = (groupMode, key) => groupMode === 'exam' ? key : null;

const GroupList = ({groups, groupMode}) => {
    if(!groups.length){
        return <div className={styles.noInfo}>Нет оценок</div>
    }

    return groups.map(({ key, items: groupRows }) => {
        return <EvaluationListItemGroup key={key} examId={getExamId(groupMode, key)} label={getGroupLabel(groupMode, key)} items={groupRows} groupMode={groupMode} />;
    })
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
    const [, setLastSeenDone] = UseLocalStorage('evaluateLastSeenDone', 0);
    // In the URL (?mode=), not component state - the module-detail screen links back
    // to /evaluations with this same param (see EvaluationListItemGroup/EvaluationDetail),
    // so both the in-app back link and the real browser back button land on the tab the
    // person was actually looking at, instead of always resetting to 'exam'.
    const [searchParams, setSearchParams] = useSearchParams();
    const groupMode = searchParams.get('mode') === 'module' ? 'module' : 'exam';
    const setGroupMode = (mode) => setSearchParams(mode === 'exam' ? {} : { mode });
    const done = items.filter(it => it.evaluate?.status === 'done').length;
    const groups = groupItems(items, groupMode);

    useEffect(() => {
        global.http.get('/evaluate-list', {}).then(data => {
            const list = data || [];
            setItems(list);
            setLastSeenDone(list.filter(it => it.evaluate?.status === 'done').length);
        }).finally(() => setLoading(false));
    }, []);


    if (loading) {
        return <div style={{ padding: 20 }}>Загрузка...</div>;
    }



    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h4>Оценки ИИ</h4>
                <span>{done}/{items.length} оценено</span>
                <GroupModeSwitch groupMode={groupMode} setGroupMode={setGroupMode} />
            </div>
            <GroupList groupMode={groupMode} groups={groups} />
        </div>
    );
}

export default EvaluationList;
