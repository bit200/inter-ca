import {useState} from "react";

const addExamData = (itemsArr = [], exam) => itemsArr.map(item => ({...item, exam}))

export const useExamData = (setSelectedInd, getExamId) => {
    const [exam, setExam] = useState({})
    const [loading, setLoading] = useState(true)
    const [history, setHistory] = useState({})
    const [jsObj, setJsObj] = useState({})
    const [dbTasks, setDbTasks] = useState([])
    const [vsTasks, setVSTasks] = useState([])
    const [questionsDb, setQuestionsDb] = useState([])


    const proceedOldExamFlow = (exam) => {
        // setSelectedInd(exam.quizQuestionsCount ? -1 : 0)
        // const newJsObj = {}
        // _.each(exam.dbQuestions, q => {
        //     const jsDetails = exam.jsDetails?.find(it => it.question === q._id)
        //     newJsObj[q._id] = jsDetails?.details
        // })
        //
        // setJsObj(newJsObj)
        // todo обновить когда полностью перейдем на vs-task
        // setDbTasks(exam.dbQuestions.filter(i => i.type.includes('task')))
        // todo тут разбиваем данные со старых экзаменов по типу разделить на 3 массива
        //  setQuizesDb(exam.quizesDb)
        //             setQuestionsDb(exam.quizQuestionsPlainPub)
        alert('Старый формат экзамена')
    }

    function loadExam() {
        setLoading(true)
        global.http.get('/load-exam', {_id: getExamId()}).then(exam => {
            setExam(exam)
            setLoading(false)
            // quizesDb: info.quizesDb ?? [],
            //     audioDb: info.audioDb ?? [],
            //     tasksDb: info.tasksDb ?? []


            let history = {}
            _.each(exam.history, q => {
                history[q._id] = q.last
            })
            setHistory(history)

            // todo обновить когда полностью перейдем на vs-task
            if(!exam.tasksDb){
                return proceedOldExamFlow(exam)
            }

            const newJsObj = {}
            // todo обновить когда полностью перейдем на vs-task
            _.each(exam.tasksDb, q => {
                const jsDetails = exam.jsDetails?.find(it => it.question === q._id)
                newJsObj[q._id] = jsDetails?.details
            })
            setJsObj(newJsObj)

            setSelectedInd?.(exam.quizQuestionsCount ? -1 : 0)
            setQuestionsDb(addExamData(exam.quizQuestionsPlainPub))
            setDbTasks([...(exam.tasksDb || []), ...(exam.vsTasksDb || [])])
            setVSTasks(exam.vsTasksDb)

        })
    }

    return {
        loading,
        loadExam,
        history,
        jsObj,
        exam,
        setExam,
        dbTasks,
        questionsDb,
        vsTasks,
        setHistory,
        questionsCount: exam.quizQuestionsCount ?? 0
    }
}
