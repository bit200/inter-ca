// Модуль считается пройденным, если в mHistory стоит "ok" (ученик закрыл модуль
// итоговым квизом) ЛИБО если пройдены все его топики. Второе нужно потому, что
// последний модуль курса закрывается финальным интервью, а оно пишет свой
// результат мимо mHistory - без этого полностью пройденный курс из одного модуля
// и шести топиков показывал 6 из 7, то есть 86% вместо 100% (задача #1038).
export function isModuleDone(item, mHistory, qHistory) {
    if ((((mHistory || {})[(item || {}).module]) || {}).status === "ok") {
        return true;
    }
    let questions = (item || {}).questions || [];
    if (!questions.length) {
        return false;
    }
    return _.every(questions, (qId) => ((qHistory || {})[qId] || {}).status === "ok");
}

export function getCoursePerc(course, history) {
    let hist = (history || {})[(course || {})._id];
    let {qHistory = {}, mHistory = {}} = hist || {};
    let total = 0;
    let goodCount = 0;

    let activeInd = 0;
    let isBad = false;
    _.each((hist || {}).modules, (item, ind) => {
        total++;
        if (isModuleDone(item, mHistory, qHistory)) {
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
    });
    return Math.round((100 * goodCount) / (total || 1));
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


// Вкладка "На повторение" показывает прочитанные вопросы, но квизы к ним заводятся
// отдельно: у части вопросов их нет вовсе, а бэкенд /load-by-any умеет отдавать квиз
// только по _id (ветка загрузки общего квиза по question там отключена). Клик по такому
// вопросу открывал заглушку "На данный момент вы повторили все задания" - вопрос виден,
// а повторять нечего. Не показываем такие вопросы в списке вовсе.
export function hasRepeatQuizes(questionsWithQuizes, _id) {
    return (((questionsWithQuizes || {})[_id]) || []).some(it => it && it._id != null);
}

export function filterQuestionsForRepeat(questions = [], questionsWithQuizes = {}) {
    return (questions || []).filter(it => hasRepeatQuizes(questionsWithQuizes, it && it._id));
}

// Вопрос попадает в список "На повторение" по факту прочтения (isRead), а квизы к нему
// заводятся отдельно - у части вопросов их нет вовсе. Раньше выборка шла строго по
// questionsWithQuizes, поэтому клик по такому вопросу давал пустой список и заглушку
// "На данный момент вы повторили все задания", хотя вопрос в списке виден.
// Подставляем общий (general) квиз по самому вопросу - ровно то, что уже делает
// getSortedQuizesByQuestion; /load-by-any умеет грузить квиз по question без _id
// (см. getDBQuizes).
export function addGeneralQuizFallback(quizes = [], questionIds = [], isAllowed) {
    let allowed = isAllowed || (() => true);
    let withQuizes = (quizes || []).reduce((acc, it) => {
        if (it && it.question != null) {
            acc[it.question] = true;
        }
        return acc;
    }, {});

    let fallback = (questionIds || [])
        .filter(id => !withQuizes[id] && allowed(id))
        .map(id => ({question: id, isGeneral: true, order: 1, nextCd: 0, lastCd: 0}));

    return [...(quizes || []), ...fallback];
}

// Собирает список квизов для повторения по выбранным вопросам: сначала по одному
// первому (order == 1) давно не открывавшемуся квизу на вопрос, затем добираем
// остальные до total. Вынесено из CoursesList.smartClick, чтобы поведение можно
// было проверить тестом.
export function pickRepeatQuizes(opts) {
    let {
        questionsWithQuizes = {},
        calcQuiz = {},
        questionIds = [],
        visibleQuestionsObj = {},
        total = 7,
        isExam = false,
        getRecentCd = () => 0,
        now = Date.now(),
    } = opts || {};

    let questionsObj = (questionIds || []).reduce((acc, it) => {
        acc[(it && it._id) || it] = true;
        return acc;
    }, {});

    let allQuizes = Object.keys(questionsWithQuizes).reduce((acc, key) => {
        if (!questionsObj[key]) {
            return acc;
        }
        let items = questionsWithQuizes[key] || [];
        return [...acc, ...items.map(it => ({...it, question: key, ...calcQuiz[it._id] || {}}))];
    }, []);

    allQuizes = addGeneralQuizFallback(allQuizes, Object.keys(questionsObj), id => !!visibleQuestionsObj[id]);

    let sortedAllQuizes = allQuizes
        .map((it, ind) => ({it, ind}))
        .sort((a, b) => {
            let weight = (v) => {
                let cd = v.nextCd || 0;
                return isExam ? (cd || getRecentCd(v) || 0) : cd;
            };
            return (weight(a.it) - weight(b.it)) || (a.ind - b.ind);
        })
        .map(v => v.it);

    let orders = {};
    sortedAllQuizes.forEach((item) => {
        let questionId = item.question;
        orders[questionId] = orders[questionId] || 0;
        item.order = ++orders[questionId];
    });

    let days = 1000 * 24 * 3600;
    let lastCdLimit = Math.round((now - 1 * days) / 1000);

    let quizes = [];
    let localQuestions = {};
    sortedAllQuizes.forEach((item) => {
        let {question, order, lastCd} = item;
        if (lastCdLimit > (lastCd || 0) && visibleQuestionsObj[question] && order == 1
            && !localQuestions[question] && quizes.length < total) {
            quizes.push(item);
        }
    });
    sortedAllQuizes.forEach((item) => {
        if (visibleQuestionsObj[item.question] && quizes.indexOf(item) === -1 && quizes.length < total) {
            quizes.push(item);
        }
    });

    return quizes;
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
    // /auto-interview is the generic auto-CRUD route for the AutoInterview model, which
    // defaults to admin-only auth (see itk-platform-en initDb.js) - it 403s for the regular
    // candidates who start their own trial exams here, so the resulting quiz answers never
    // get tagged with an autoInterview id and "Результаты пробного экзамена" has nothing to
    // show later. /create-auto-interview is a dedicated, candidate-auth-scoped endpoint.
    return http.post('/create-auto-interview', opts)
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
        questions, goodQuestions,
        perc: Math.min(100, Math.round(100 * goodQuestions / (questions || 1)))}
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

