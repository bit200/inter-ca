import Button from "../../../libs/Button";
import {Link, Outlet} from "react-router-dom";
import React, {useState} from 'react';
import {getCoursePerc, getPercByIds} from "./mainMethods";
import CircularProgress2 from "./CircularProgress2";
import {NewPerc} from "../CoursesListOld";
import Skeleton from "../../../libs/Skeleton/Skeleton";
import MyImg from "../../MyImg";
import NotFound from "../../../libs/NotFound/NotFound";

function Layout2(props) {

    let {courses, history, loading, onClick, res} = props;
    if (loading) {
        return <Skeleton woLabel={false} count={7} title={t('loading')}></Skeleton>
    }
    return <div>
        <div
            data-courses={(courses || []).length}
            className="animChild coursesItems"
        >
            {/*<hr style={{marginTop: '10px', marginBottom: '5px', opacity: 0}}/>*/}
            <div className="table-responsive">
                <table className="table mb-0">
                    <thead className="table-light">
                    <tr>
                        <th className="border-top-0">{t('course')}</th>
                        <th className="border-top-0" style={{width: '25%'}}>%</th>
                    </tr>
                    </thead>
                    <tbody className={'animChild'}>

                    {(courses || []).map((it, ind) => {
                        let perc = getCoursePerc(it, history);
                        let hist = (history || {})[it._id] || {};

                        let {train, exam} = getPercByIds(hist.questions, res)
                        perc = perc || 0;
                        return (<tr key={ind}
                                    onClick={() => {
                                        navigate("/courses/" + it._id)
                                    }}
                        >
                            <td><a href="" className="text-primary">{it.name}</a></td>
                            <td
                            >
                                <small className={'text-muted'}>{perc}%</small>
                                <NewPerc perc={perc}></NewPerc>
                            </td>
                        </tr>)
                    })}
                    </tbody>
                </table>
            </div>
            {!courses?.length && <>
                <NotFound></NotFound>
            </>}
            {/*<div>*/}
            {/*    Курсы ({courses.length})*/}
            {/*</div>*/}

            {/*<hr/>*/}
            {/*{(courses || []).map((it, ind) => {*/}
            {/*    let perc = getCoursePerc(it, history);*/}
            {/*    let hist = (history || {})[it._id] || {};*/}
            
            {/*    let {train, exam} = getPercByIds(hist.questions, res)*/}
            {/*    perc = perc || 0;*/}
            {/*    return (*/}
            {/*        <Link*/}
            {/*            to={"/courses/" + it._id}*/}
            {/*            key={ind}*/}
            {/*            className={"row"}*/}
            {/*            // onClick={(e) => {*/}
            {/*            //     onClick && onClick(hist.questions)*/}
            {/*            //*/}
            {/*            // }}*/}
            {/*        >*/}
            {/*            <div className="col-sm-3">*/}
            {/*                <div className="ib coursesProgress "*/}
            {/*                     style={{width: '100px', marginRight: '10px'}}>*/}
            {/*                    <small className={'text-muted'}>{perc}%</small>*/}
            {/*                    <NewPerc perc={perc}></NewPerc>*/}
            {/*                    /!*{v.exam} |*!/*/}
            {/*                    /!*{v.train}*!/*/}
            {/*                    /!*<div className="ib" style={{width: '50%'}}>*!/*/}
            {/*                    /!*    <CircularProgress2*!/*/}
            {/*                    /!*        zoom={.7}*!/*/}
            {/*                    /!*        title={"Практ"} value={v.train} size={20}></CircularProgress2>*!/*/}
            
            {/*                    /!*</div>*!/*/}
            {/*                    /!*<div className="ib" style={{width: '50%'}}>*!/*/}
            {/*                    /!*    <CircularProgress2*!/*/}
            {/*                    /!*        zoom={.7}*!/*/}
            {/*                    /!*        title={"Экзамен"} value={v.exam} size={20}></CircularProgress2>*!/*/}
            {/*                    /!*</div>*!/*/}
            
            {/*                </div>*/}
            {/*            </div>*/}
            {/*            <div className="col-sm-9">*/}
            {/*                <div className="w100 ellipse pointer">*/}
            {/*                    {it.name}*/}
            {/*                </div>*/}
            {/*            </div>*/}
            {/*            /!*<Link*!/*/}
            {/*            /!*    to={"/courses/" + it._id}*!/*/}
            {/*            /!*>*!/*/}
            {/*            /!*    <div className="text-left ellipse w100 pointer"*!/*/}
            {/*            /!*         style={{padding: '6px 0'}}*!/*/}
            {/*            /!*    >*!/*/}
            {/*            /!*        <div className="ib trIcons">*!/*/}
            
            {/*            /!*            <div className="fa fa-code"*!/*/}
            {/*            /!*                 onClick={(e) => {*!/*/}
            {/*            /!*                     //console.log("qqqqq hist4444", hist );*!/*/}
            {/*            /!*                     onClick && onClick(hist.questions)*!/*/}
            {/*            /!*                     return m.prevent(e)*!/*/}
            {/*            /!*                 }}*!/*/}
            {/*            /!*            ></div>*!/*/}
            {/*            /!*        </div>*!/*/}
            {/*            /!*        <div className="ib coursesProgress"*!/*/}
            {/*            /!*             style={{width: '60px', marginRight: '7px'}}>*!/*/}
            {/*            /!*            <div className="ib" style={{width: '33%'}}>*!/*/}
            {/*            /!*                <CircularProgress2*!/*/}
            {/*            /!*                    zoom={.7}*!/*/}
            {/*            /!*                    title={"Теория"} value={perc} size={20}></CircularProgress2>*!/*/}
            {/*            /!*            </div>*!/*/}
            {/*            /!*            <div className="ib" style={{width: '33%'}}>*!/*/}
            {/*            /!*                <CircularProgress2*!/*/}
            {/*            /!*                    zoom={.7}*!/*/}
            {/*            /!*                    title={"Практ"} value={train} size={20}></CircularProgress2>*!/*/}
            {/*            /!*            </div>*!/*/}
            {/*            /!*            <div className="ib" style={{width: '33%'}}>*!/*/}
            {/*            /!*                <CircularProgress2*!/*/}
            {/*            /!*                    zoom={.7}*!/*/}
            {/*            /!*                    title={"Экзамен"} value={exam} size={20}></CircularProgress2>*!/*/}
            {/*            /!*            </div>*!/*/}
            {/*            /!*        </div>*!/*/}
            {/*            /!*        <div className="courseTitle ib" style={{}}>{it.name}</div>*!/*/}
            {/*            /!*        /!*<div className="icons">*!/*!/*/}
            {/*            /!*        /!*    <Button size={'xs'} color={4}>*!/*!/*/}
            {/*            /!*        /!*    </Button>*!/*!/*/}
            {/*            /!*        /!*    <Button size={'xs'} color={4}>*!/*!/*/}
            
            {/*            /!*        /!*    </Button>*!/*!/*/}
            {/*            /!*        /!*</div>*!/*!/*/}
            {/*            /!*        /!*<small>Кол-во модулей: {(hist.modules || []).length}</small>*!/*!/*/}
            {/*            /!*    </div>*!/*/}
            {/*            /!*</Link>*!/*/}
            {/*        </Link>*/}
            {/*    );*/}
            {/*})}*/}
        </div>
    </div>
}

export default Layout2


