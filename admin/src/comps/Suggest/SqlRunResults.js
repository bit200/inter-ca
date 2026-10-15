import React from 'react';
import './sqlRun.scss';

// Быстрые SQL-задания (codeType 'sql'): запрос пишется в Monaco, /run-question гоняет его
// на эфемерной БД рядом с эталоном и отдаёт обе выборки — здесь они показываются таблицами.

export function isSqlDetails(jsDetails) {
    return (jsDetails || {}).codeType === 'sql';
}

function Cell({value}) {
    if (value === null || value === undefined) return <td className="sqlNull">NULL</td>;
    return <td>{String(value)}</td>;
}

export function SqlResultTable({result, title}) {
    let {columns = [], rows = [], truncated} = result || {};
    return <div className="sqlResultBlock">
        <div className="sqlResultTitle">
            {title}
            <small>{t('sqlRowsCount')}: {rows.length}{truncated ? '+' : ''}</small>
        </div>
        {!columns.length
            ? <div className="sqlResultEmpty">—</div>
            : <div className="sqlResultScroll">
                <table className="sqlResultTable">
                    <thead>
                    <tr>{columns.map((c, i) => <th key={i}>{c.name}</th>)}</tr>
                    </thead>
                    <tbody>
                    {rows.map((row, i) => <tr key={i}>{row.map((v, j) => <Cell key={j} value={v}/>)}</tr>)}
                    </tbody>
                </table>
            </div>}
        {truncated && <div className="sqlResultNote">{t('sqlRowsTruncated')}</div>}
    </div>
}

function SqlCase({item, showTitle}) {
    let {ok, hidden, reason, message, actual, expected} = item || {};
    return <div className="sqlCase" status={ok ? 'ok' : 'error'} data-testid="sql-case"
                data-ok={ok ? 'true' : 'false'} data-hidden={hidden ? 'true' : 'false'} data-reason={reason || ''}>
        <div className="sqlCaseHead">
            <span className="run-circle"></span>
            {showTitle && <b>{hidden ? t('sqlHiddenCase') : t('sqlPublicCase')}</b>}
            <span>{ok ? t('sqlCaseOk') : message}</span>
        </div>
        {(actual || expected) && <div className="sqlCaseTables">
            {actual && <SqlResultTable title={t('currentResult')} result={actual}/>}
            {expected && <SqlResultTable title={t('expectResult')} result={expected}/>}
        </div>}
    </div>
}

export function SqlRunResults({runResults}) {
    let {sqlResults = [], totalCount, passCount, firstError} = runResults || {};
    if (!totalCount) return <div>{t('notStartedTests')}</div>;
    // Сбой запроса до раннера (сеть, 500) приходит без sqlResults — только текст ошибки.
    let requestError = !sqlResults.length && firstError
        ? firstError.errMsg || (firstError.res1 || {}).errMsg
        : '';
    return <div className="sqlRunResults" data-testid="sql-run-results"
                data-pass={passCount || 0} data-total={totalCount}>
        <div>{t('testPasses')} {passCount} {t('from')} {totalCount}</div>
        {requestError && <div className="sqlCase" status="error" data-testid="sql-case" data-ok="false" data-reason="request_error">
            <div className="sqlCaseHead"><span className="run-circle"></span><span>{String(requestError)}</span></div>
        </div>}
        {sqlResults.map((item, ind) => <SqlCase key={ind} item={item} showTitle={sqlResults.length > 1}/>)}
    </div>
}

// Нижняя панель вместо тест-кейсов: студент видит, какие таблицы есть в БД.
export function SqlSchemaPanel({jsDetails}) {
    let {schemaSql, dialect} = jsDetails || {};
    return <div className="sqlSchemaPanel" data-testid="sql-schema">
        <div className="sqlResultTitle">
            {t('sqlSchema')}
            <small>{dialect === 'postgres' || !dialect ? 'PostgreSQL 16' : dialect}</small>
        </div>
        <pre>{schemaSql || '—'}</pre>
    </div>
}

// Админка: результат эталонного запроса (ответ /admin-get-responses с codeType 'sql').
export function SqlReferenceResults({data}) {
    let {results = [], ordered} = data || {};
    return <div className="sqlRunResults">
        <small>{ordered ? t('sqlOrdered') : t('sqlUnordered')}</small>
        {results.map((it, ind) => <div key={ind} className="sqlCase" status={it.expected ? 'ok' : 'error'}>
            <div className="sqlCaseHead"><b>{it.name}</b>{!it.expected && <span>{it.message}</span>}</div>
            {it.expected && <SqlResultTable title={t('expectResult')} result={it.expected}/>}
        </div>)}
    </div>
}
