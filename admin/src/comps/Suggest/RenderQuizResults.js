import React, {useState, useEffect, useMemo} from 'react';
import QuizPreview from "./QuizPreviewNew";

function RenderQuizResult(props) {
    const [selectedIndLocal, setSelectedInd] = useState(0)
    const [examHist, setExamHist] = useState(getHist());
    const [userRates, setUserRates] = useState(getExamRates());

    const { exam, selectedIndex, setSelectedIndex, hideNav } = props;
    const selectedInd = selectedIndex ?? selectedIndLocal;
    const examResultItemsFull  = useMemo(() => [...(exam.quizQuestionsPlain || [])], [exam])
    const quiz = examResultItemsFull[selectedInd] ?? {}

    const {rate, codeRate} = getUserRates(quiz)
    const isAudio = isAudioFn(quiz)
    const showCodeRate = isShowCodeRateFn(quiz)

    function getHist() {
        let history = props.history;
        return ((history['-1'] || {}).quizHistory || {}).history || {}
    }

    function getExamRates() {
        return (props.exam || {}).userRates || {}
    }

    useEffect(() => {
        setExamHist(getHist())
        setUserRates(getExamRates())
    }, [props.history]);

    function onUpdate(opts) {
        let quizId = opts.quiz;

        userRates[`quiz_` + quizId] = {...userRates[`quiz_` + quizId] || {}, ...opts};
        examHist[quizId] = {...examHist[quizId] || {}, ...opts}
        setExamHist({...examHist})
        setUserRates({...userRates})
        let hist = (examHist[quizId] || {});
        global.http.get('/put-rate', {exam: exam._id, hash: hist.hash, ...userRates[`quiz_` + quizId]})

    }

    function isAudioFn(quiz) {
        return /audio|code/gi.test(quiz?.answerType || '')
    }

    function isShowCodeRateFn(quiz) {
        return quiz?.answerType === 'code'
    }

    function getUserRates(quiz) {
        let {rate, codeRate} = (userRates || {})[`quiz_` + quiz?._id] || {}
        return {rate, codeRate}
    }

    const getItemNameAndDesc = (item) => {
        return ({title: item.name ?? item.specialTitle, smallTitle: '', desc: ''})
    }

    const handleSelectItem  = (event) => {
        const ind = Number(event.target.dataset.quizIndex ?? '')
        const quizId = Number(event.target.dataset.quizId ?? '')
        const hist = examHist[quizId] || {}
        const playerParams = hist?.hash ? { hash: hist.hash, user: exam.user } : { src: '' }

        myPlayer(playerParams)
        if(typeof setSelectedIndex === 'function') {
            setSelectedIndex(ind)
            return
        }
        setSelectedInd(ind)
    }

    const renderQuizSelectionList = () => {
        return (exam.quizQuestionsPlain || []).map((it, ind) => {
            let quiz = it;

            let hist = examHist[it._id] || {}
            let {rate, codeRate} = getUserRates(quiz)
            let showCodeRate = isShowCodeRateFn(quiz);
            let isAudio = isAudioFn(quiz);
            let isError = () => {
                return isAudio && hist?.hash && !rate;
            }
            return (<div
                className={'menuList ' + (ind == selectedInd ? 'activeList' : '')}
                key={it._id + 'quizQuestionsPlain'}
                data-quiz-index={ind}
                data-quiz-id={it._id}
                onClick={handleSelectItem}>

                <strong className={'ellipse w100'}>
                    {isError() && <span className="label label-danger mr-5">{t('rateAnswer')}</span>}
                    {t('question')} #{ind + 1}
                </strong>
                <div>
                    {isAudio && !rate && !codeRate && <div className="ib mr-10">
                        <div className="badge bg-dark-subtle text-dark">
                            {t('needRate')}
                        </div>
                    </div>
                    }
                    <small>
                        {isAudio && rate && <div className="ib mr-10">
                            {t('audioRate')}: {rate}
                        </div>}
                        {showCodeRate && codeRate && <div className="ib">
                            {t('codeRate')}: {codeRate}
                        </div>}
                    </small>
                </div>

            </div>)
        })
    }

    if (!exam || !exam.quizQuestionsPlain || !exam.quizQuestionsPlain.length) {
        return null
    }

    const contentJSX = <div style={{padding: '20px'}}>
        {isAudio && <>
            <div>
                <small>{t('rateYourAnswer')}</small>
            </div>
            <div>
                {([1, 2, 3, 4, 5] || []).map((it, ind) => {
                    return (
                        <button key={ind + 'rate_audio_ind' + quiz._id}
                                onClick={() => {
                                    onUpdate({ quiz: quiz._id, rate: it })
                                }}
                                className={'btn btn-sm ' + (rate == it ? 'btn-primary btn-active active selected' : 'btn-light')}>
                            {it}
                        </button>
                        )
                })}
            </div>
        </>}
        {showCodeRate && <>
            <div>
                <small>{t('rateYourCode')}</small>
            </div>
            <div>
                {([1, 2, 3, 4, 5] || []).map((it, ind) => {
                    return <>
                        <button key={ind}
                                onClick={() => {
                                    onUpdate({quiz: quiz._id, codeRate: it})
                                }}
                                className={'btn btn-sm ' + (codeRate == it ? 'btn-primary btn-active active selected' : 'btn-light')}>
                            {it}
                        </button>
                    </>
                })}
            </div>
        </>}
        {isAudio && <div><hr/></div>}
        <QuizPreview
            item={quiz}
            activeInd={selectedInd}
            skipBottomOpenText={true}
            hist={{...(examHist || {})[quiz?._id]}}
            opts={{canResubmitQuiz: false}}
            getItemNameAndDesc={getItemNameAndDesc}
            onSubmit={() => {}}
        />
    </div>

    if (hideNav) {
        return <div className="card">
            <div className="card-body">
                {contentJSX}
            </div>
        </div>
    }

    return <div className={'quizResults row'}>
        <hr/>
        <div className="col-sm-3 sticky3">
            <div className="card">
                <div className="card-body">
                    {renderQuizSelectionList()}
                </div>
            </div>
        </div>
        <div className="col-sm-9 sticky3">
            <div className="card">
                <div className="card-body">
                    {contentJSX}
                </div>
            </div>
        </div>
    </div>
}

export default RenderQuizResult