import React, {useState} from 'react';
import Button from "../../../libs/Button";
import m from "../../../libs/m/m";
import './Interviews.css'
import {NewPerc} from "../CoursesListOld";
import Skeleton from "../../../libs/Skeleton/Skeleton";
import NotFound from "../../../libs/NotFound/NotFound";

// import AutoInterview from "../AutoInterview";

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);

    let [interview, setInterview] = useState(null)

    let {res, onClick, loading, onTrain} = props;
    // res.interviews = []
    interview = interview || (res.interviews || [])[0];

    let getCl = (value, prefix) => {
        value = +value;
        let postfix = value == 5 ? 'Ok iconoir-double-check' : !value ? 'o5 iconoir-minus' : value < 4 ? 'o5 iconoir-xmark' : 'iconoir-check'
        return ' ' + prefix + postfix
    }

    if (loading) {
        return <Skeleton woLabel={false} count={7} title={t('loading')}></Skeleton>
    }

    return <div>
        <div className="card2 animChild">
            <div className="tr">
                <button className={'btn btn-sm btn-primary'} onClick={() => {
                    props.start && props.start()
                }}>
                    <i className="iconoir-sparks">
                    </i>
                    {t('startMockInterview')}
                </button>
            </div>
            <hr style={{opacity: 0, marginTop: '15px', marginBottom: 0}}/>
            <div className="table-responsive">
                <table className="table mb-0">
                    <thead className="table-light">
                    <tr>
                        <th className="border-top-0">{t('date')}</th>
                        <th className="border-top-0" style={{width: '25%'}}>{t('resultMsg')}</th>
                    </tr>
                    </thead>
                    <tbody className={'animChild'}>
                    {(res.interviews || []).map((it, ind) => {
                        return (<tr key={ind}
                                    onClick={() => {
                                        onClick && onClick(it)
                                        setInterview(it)
                                    }}
                        >
                            <td><a href="" className="text-primary">{m.date_time_short(it.cd)}</a></td>
                            <td
                            >
                                {(it.quizes || []).map((it2, ind) => {
                                    let st = (it.info || {})[it2] || {}
                                    console.log("qqqqq stttttt", st, it, it2);
                                    return (<div key={ind}
                                                 className={'ib'} style={{marginTop: '3px'}}>
                                        <div className={'interviewIndicator2 '
                                            + (st?.adminRate ? 'adminRated2 ' : ' ')
                                            + getCl(st?.adminRate || st?.rate || 1, '')
                                            // + getCl(st?.adminRate, 'admin')
                                        }>
                                        </div>
                                        {/*<div className={'interviewIndicator '*/}
                                        {/*    // + getCl(st?.rate || 1, 'main')*/}
                                        {/*    + getCl(st?.adminRate, 'main')*/}
                                        {/*}>*/}

                                        {/*</div>*/}
                                    </div>)
                                })}
                            </td>
                        </tr>)
                    })}
                    </tbody>
                </table>
                {!res?.interviews?.length && <NotFound></NotFound>}
            </div>
            {/*<div>Мои Тренир. Интервью</div>*/}
            {/*/!*<Button color={4} size={'xs'}>Тренировать проблемные вопросы</Button>*!/*/}
            {/*<hr/>*/}
            {/*<div className="row">*/}
            {/*    <div className="col-sm-12">*/}
            {/*        <div className={'fbList animChild pointer hoverChild'}>*/}

            {/*            {!(res.interviews || []).length && <>*/}
            {/*                Здесь будет список ваших треноровочных интервью*/}
            {/*            </>}*/}
            {/*            {(res.interviews || []).map((it, ind) => {*/}
            {/*                return (<div key={ind} onClick={() => {*/}
            {/*                    onClick && onClick(it)*/}
            {/*                    setInterview(it)*/}
            {/*                }}>*/}
            {/*                    {m.date_time_short(it.cd)}*/}

            {/*                    {(it.quizes || []).map((it2, ind) => {*/}
            {/*                        let st = (it.info || {})[it2] || {}*/}
            {/*                        console.log("qqqqq stttttt", st, it, it2);*/}
            {/*                        return (<div key={ind}*/}
            {/*                                     className={'ib'} style={{marginTop: '3px'}}>*/}
            {/*                            <div className={'interviewIndicator '*/}
            {/*                                + (st?.adminRate ? 'adminRated ' : ' ')*/}
            {/*                                + getCl(st?.adminRate || st?.rate || 1, 'main')*/}
            {/*                                // + getCl(st?.adminRate, 'admin')*/}
            {/*                            }>*/}
            {/*                            </div>*/}
            {/*                            /!*<div className={'interviewIndicator '*!/*/}
            {/*                            /!*    // + getCl(st?.rate || 1, 'main')*!/*/}
            {/*                            /!*    + getCl(st?.adminRate, 'main')*!/*/}
            {/*                            /!*}>*!/*/}

            {/*                            /!*</div>*!/*/}
            {/*                        </div>)*/}
            {/*                    })}*/}


            {/*                </div>)*/}
            {/*            })}*/}
            {/*        </div>*/}

            {/*    </div>*/}
            {/*    /!*<div className="col-sm-8">*!/*/}
            {/*    /!*  <AutoInterview interview={interview}*!/*/}
            {/*    /!*                 onClick={onTrain}*!/*/}
            {/*    /!*  ></AutoInterview>*!/*/}
            {/*    /!*</div>*!/*/}
            {/*</div>*/}
        </div>
    </div>
}

export default Layout2
