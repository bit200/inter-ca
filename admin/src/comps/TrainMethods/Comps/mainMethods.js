export function getCoursePerc(course, history) {
    let hist = (history || {})[course._id];
    let {qHistory = {}, mHistory = {}} = hist || {};
    let total = 0;
    let goodCount = 0;
    //console.log("qqqqq course333333333", hist);

    let activeInd = 0;
    let isBad = false;
    _.each(hist.modules, (item, ind) => {
        total++;
        if (((mHistory || {})[item.module] || {}).status === "ok") {
            goodCount++;
        }
        _.each(item.questions, (qId, ind) => {
            total++;

            if (!isBad && hist && (qHistory[qId] || {}).status === "ok") {
                activeInd = ind + 1;
                goodCount++;
            } else {
                isBad = true;
            }
        });

        // let hist = history[item.module]
        // console.log("qqqqq hist", hist, item.module, history);
    });
    //console.log("qqqqq goodCount", mHistory, hist, goodCount, total);
    return Math.round((100 * goodCount) / total);
}


export function getPercByIds(questions, res) {
    let calcQuestion = res?.result?.calcQuestion || {}

    let total = 0;
    let train = 0
    let exam = 0

    _.each(questions, (item, ind) => {
        let _id = item;
        let calc = (calcQuestion[_id] || {empty: true})
        //console.log("qqqqq questions4444 calccalccalccalccalc", calc, calcQuestion);
        total++;
        train += calc.train || 0
        exam += calc.exam || 0
    })


    let getPerc = (v) => {
        return Math.round((+v / (total || 1)))

    }
    //console.log("qqqqq questions4444", questions, res, calcQuestion);
    //console.log("qqqqq questions4444555", {train, exam});

    return {train: getPerc(train), exam: getPerc(exam)};

}


export function getSortedQuizesByQuestion(res, _id, key = 'train', size = 7) {
    let {questionsWithQuizes, calcQuiz} = res?.result || {}
    let potentialQuizes = questionsWithQuizes[_id] || [];
    let generalQuiz = potentialQuizes.find(it => it.specialType == 'general');
    if (!generalQuiz) {
        potentialQuizes.push({question: _id, isGeneral: true})
    }

    potentialQuizes = _.sortBy(potentialQuizes.map(it => {
        return {...it, calc: calcQuiz[it._id || 'general'] || {}}
    }), sortFn(key))
    return {quizes: potentialQuizes.splice(0, size), generalQuiz}
}

export async function loadGeneralQuiz({_id, _ids}) {
    let res = await http.get("/load-by-general-questions", {_ids: _ids || [_id]})
    return _id ? res[0] : res;
}


export async function getDBQuizes(items, isExam) {
    let obj = {}
    _.each(items, (item, ind) => {
        obj[item._id] = ind;
    })

    let _items = items.map(it => {
        let qId = it?.question?._id || it?.question || null;
        return {...(it._id ? {_id: it._id} : {}), ...(qId ? {question: qId} : {})}
    })

    //console.log("qqqqq c{{{{ items", items, _items);
    let res = await http.get("/load-by-any", {items: _items, isExam})
    return _.sortBy(res, it => {
        let _id = it?.item?._id;
        return obj[_id]
    });
}


export function sortFn(key) {
    return (it) => {
        return (1) * (+(it.calc || {})[key] || 0);
    }
}

export async function createAutoInterview(opts) {
    return http.post('/auto-interview', opts)
}


export function getAllQuestions(history) {
    let questions = []
    _.each(history, (item, ind) => {
        questions = [...questions || [], ...item.questions || []]
    })
    return _.uniq(questions);

}

export function getTopStatsNew({res, history}) {
    console.log("qqqqq ressssssssssssssssss", res, history);
    let modules = 0;
    let goodQuestions = 0;
    _.each(res.userCourses, (item, ind) => {
        modules += item?.modules?.length
        goodQuestions += _.size(item?.qHistory)
    })
    let questions = res?.questionIds?.length || res?.result?.questions?.length;
    return {modules,
     courses: res?.userCourses?.length,
        questions, perc: Math.min(100, Math.round(100 * goodQuestions / (questions || 1)))}
}

export function getTotalStats({res, history}) {

    let questions = getAllQuestions(history)
    let calcQuestion = res?.result?.calcQuestion || {}
    //console.log("qqqqq calcQuestion ]]", questions, calcQuestion);

    let trainTScore = 0;
    let examTScore = 0;
    let trainNotNullCount = 0;
    let examNotNullCount = 0;
    let examNotNullAvgRate = 0;
    let trainNotNullAvgRate = 0;
    let examRate5Count = 0;
    let trainRate5Count = 0;

    _.each(questions, (_id, ind) => {
        let stats = calcQuestion[_id] || {};
        let {
            exam = 0, train = 0, trainWoEmpty = 0,
            examWoEmpty = 0, lastExam, lastTrain,
            lastTrainRate = 0, lastExamRate = 0
        } = stats || {};
        //console.log("qqqqq questions!!!!!!!!", _id, exam, train);

        if (lastExam) {
            examNotNullCount++;
            examNotNullAvgRate += examWoEmpty;
        }
        if (lastTrain) {
            trainNotNullCount++;
            trainNotNullAvgRate += lastTrainRate;
        }

        if (lastExamRate == 100) {
            examRate5Count++
        }
        if (lastTrainRate == 100) {
            trainRate5Count++
        }
        examTScore += exam
        trainTScore += train
    })

    let total = (questions || []).length;

    let avg = (v1, v2) => {
        return Math.round((v1 / (v2 || 1)) || 0)
    }
    let perc = (v1, v2) => {
        return Math.round((100 * v1 / (v2 || 1)) || 0)
    }

    //console.log("qqqqq examTScore", examTScore);
    return {
        train: avg(trainTScore, total),
        exam: avg(examTScore, total),
        examNotNullAvgRate: avg(examNotNullAvgRate, examNotNullCount),
        trainNotNullAvgRate: avg(trainNotNullAvgRate, trainNotNullCount),
        examNotNullCount,
        trainNotNullCount,
        exam100: perc(examRate5Count, total),
        train100: perc(trainRate5Count, total),

    }
}

