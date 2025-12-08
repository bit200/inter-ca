import React, {useEffect, useState} from 'react';
import Input from "../libs/Input";
import MyModal from "../libs/MyModal";
import CourseDetails from "./Suggest/CourseDetails";
import PreviewCourseModule, {QuestionDetailsNew} from "./Suggest/PreviewCourseModule";
import Skeleton from "../libs/Skeleton";
import MyImg from "./MyImg";


function getSearch() {
    return decodeURIComponent(window.location.search.split('?q=')[1] || '')
}

function Layout2(props) {
    let [loading, setLoading] = useState(false)
    let [search, setSearch] = useState(getSearch())
    let [res, setRes] = useState({})
    let [goodObj, setGoodObj] = useState({})
    let [goodQ, setGoodQ] = useState([])
    let [badQ, setBadQ] = useState([])
    let [match, setMatch] = useState({})
    let [stats, setStats] = useState({})
    let [open, setOpen] = useState(false)

    search = (search || '').replace(/[^0-9a-zа-я\s.,]/gi, "");

    useEffect(() => {
        setLoading(true)
        global.http.get('/load-my-courses-details').then(r => {
            console.log("qqqqq rrrrrrrrrrrrrrrrrr res send", r);
            stats = {q: {}, modules: {}, courses: {}}
            _.each(r.userCourses, (it, ind) => {
                _.each(it.qHistory, (item, ind) => {
                    if (item.status == 'ok') {
                        goodObj[ind] = {status: 'ok', course: it}
                    }
                })
                _.each(it.modules, (it2, ind) => {
                    _.each(it2.questions, (item, ind) => {
                        stats.q[item] = {
                            course: it.course,
                            module: it2.module,
                            isGood: goodObj[item]
                        }
                    })
                })

            })
            _.each(r.courses, (item, ind) => {
                stats.courses[item._id] = item;
                _.each(item.modules, (item, ind) => {
                    stats.modules[item.module] = item;
                })
            })
            setStats(stats)
            goodQ = [];
            badQ = [];
            _.each(r.shortQuestions, (item, ind) => {
                if (goodObj[item._id]) {
                    goodQ.push(item)
                } else {
                    badQ.push(item)
                }
            })


            setLoading(false)
            setRes(r)
            setGoodQ(goodQ)
            setBadQ(badQ)
        })
    }, [])

    useEffect(() => {
        history.replaceState({},"Поиск ...",`/search?q=${search}`);
    }, [search])

    function onSearch() {

        let reg = new RegExp(search, 'gi')
        match = {good: [], bad: []}
        _.each(goodQ, (item, ind) => {
            let index = (item.text || '').search(reg);
            if (index != -1) {
                match.good.push({index, ...item})
            }
        })
        _.each(badQ, (item, ind) => {
            let index = (item.text || '').search(reg);
            if (index != -1) {
                match.bad.push({index, ...item})
            }
        })

        // match.push()
        return match;
    }

    let mm = onSearch()

    function pub(item) {
        let limit = 120;
        let s1 = item.text.substring((item.index - limit), item.index);
        let ind0 = item.index + search?.length;
        let s3 = item.text.substring(ind0, ind0 + Math.min(ind0, s1.length));
        if (item.text?.length > ind0 + s1?.length) {
            s3 += '...'
        }

        return {s1, s2: search, s3}
    }

    function Comp({item, isGood}) {
        let qq = stats.q[item._id] || {}
        console.log("qqqqq compaaaaaaaaaaaa", qq, stats);
        let cl = isGood ? 'text-success' : 'text-danger'
        let cl2 = isGood ? 'bg-success-subtle' : 'bg-danger-subtle'
        return <div className={'ib'}>
            <span className={`badge ${cl2} ${cl}`}>{stats.courses[qq.course]?.name}</span>
            <i className={`iconoir-nav-arrow-right  ${cl}`} style={{marginBottom: '-3px', marginLeft: '-2px'}}></i>
            <span className={`badge ${cl2} ${cl}`}>{stats.modules[qq.module]?.name}</span>
        </div>
    }


    // let v = useActionData();
    let isGood = search.length >= 2;
    let count = mm?.good?.length + mm?.bad?.length;
    let rind = search;
    return <>
        <div className={'card'}>
            <div className="card-body searchBlock">
                <Input
                    woLabel={true}
                    placeholder={'searchByQuestions'}
                    autoselect={true}
                    type="text" value={search} onChange={setSearch}/>
                <hr/>
                {isGood && !!loading && <>
                    <Skeleton count={3}></Skeleton>
                </>}
                {!isGood && <div className={'tc'}>
                    <MyImg w={300}>lock</MyImg>
                    <h4 className={'imgH'}>{t('errSearch2symbols')}</h4>
                </div>}
                {isGood && !count && !loading && <div className={'tc'}>
                    <MyImg w={300}>404</MyImg>
                    <h4 className={'imgH'}>{t('emptyNotFoundRequest')}</h4>
                </div>}
                <div className="animChild">
                    {isGood && !loading && <>
                        {(mm.good || []).map((item, ind) => {
                            let ss = pub(item);
                            return (<div
                                className={'pointer'}
                                key={ind + rind} onClick={() => {
                                setOpen({questionId: item._id})
                            }}>
                                <Comp item={item} isGood={true}></Comp>
                                <div>
                                    {ss.s1}<span className={'bg-success-subtle'}>{ss.s2}</span>{ss.s3}
                                </div>
                                <hr/>
                            </div>)
                        })}
                        {(mm.bad || []).map((item, ind) => {
                            if (ind > 5) {
                                return null;
                            }
                            let ss = pub(item);
                            return (<div key={ind + rind + 1000}
                                         className={'pointer'}
                                         onClick={() => {
                                             setOpen({})
                                         }}>
                                <i className=" "
                                  >
                                    <i
                                        style={{marginBottom: '-3px'}}
                                        className={'bg-danger-subtle text-danger iconoir-lock '}></i>
                                </i>
                                <small className={'badge bg-danger-subtle text-danger'}>Вопрос еще не открыт</small>

                                <Comp item={item}></Comp>

                                <div className={'ssxasdf'}>
                                    {ss.s1}<span className={'bg-danger-subtle'}>{ss.s2}</span>{ss.s3}
                                </div>
                                {ind != 5 && mm?.bad?.length != (ind + 1) && <hr/>}
                            </div>)
                        })}

                    </>}
                </div>
            </div>

            <MyModal
                isOpen={open}
                onClose={() => setOpen(false)}
            >
                {!!open.questionId && <QuestionDetailsNew questionId={open.questionId}></QuestionDetailsNew>}
                {!open.questionId && <div className={'tc'}>

                    <MyImg w={250}>lock</MyImg>
                    <h3 style={{marginTop: '20px'}}>Данный модуль будет доступен после <br/> открытия в разделе курсов
                    </h3>
                </div>}
            </MyModal>
        </div>
    </>
}

export default Layout2
