import React, {useEffect, useState} from 'react';
import _ from 'underscore';
import './tree.css'
import {
    Link, Outlet
} from "react-router-dom";
import MdPreview from '../Suggest/MdPreview';
import FindDuplicate from './FindDuplicate';
import './activeProject.css'

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);
    let [compObj, setCompObj] = useState({});
    let [projects, setProjects] = useState([]);
    let [loading, setLoading] = useState(true);
    let [selectedProjectInd, setSelectedProjectInd] = useState(0)

    useEffect(() => {
        setLoading(true)
        global.http
            .get('/all-projects', {})
            .then(items => {
                setProjects(items)
                setLoading(false)
            })
    }, [])

    if (loading) {
        return <div className={'tc w100 loading'}>{t('loading')} ...</div>
    }

    let project = projects[selectedProjectInd || 0]
    return <div className='row'>

        <div className="col-sm-8">
            <div className="card">
                <div className="card-body">


                    <div className=' row'>
                        {/*<div className="col-sm-4">*/}
                        {/*    Страницы*/}
                        {/*    {(project.pages || []).map((it, ind) => {*/}
                        {/*        return (<div key={ind} id={'i' + ind}>*/}
                        {/*            <a className="title2" href={'#i' + (ind + 1)}>#{ind + 1}. {it.name}</a>*/}

                        {/*        </div>)*/}
                        {/*    })}*/}
                        {/*</div>*/}
                        <div className="col-sm-12">
                            {!project && <div style={{padding: '15px 0'}}>{t('selectProject')}</div>}
                            {project && <div className={'animChilds'} style={{padding: '15px 0 35px 0'}}>
                                <div className={'title'}>{project.name}</div>
                                <hr/>
                                <MdPreview size={16} source={project.desc}></MdPreview>
                                <hr/>
                                <div className={'title'}>{t('pages')}</div>

                                {(project.pages || []).map((it, ind) => {
                                    return (<div key={ind} id={'i' + ind}>
                                        <hr/>
                                        <div className="title2">#{ind + 1}. {it.name}</div>
                                        <MdPreview source={it.desc}></MdPreview>
                                        <div className="ul-wrap">
                                            <strong>{t('functional')}</strong>
                                            <ul>
                                                {(it.features || []).map((it, ind) => {
                                                    return (<li key={ind}>
                                                        {it.name}
                                                        <div><small>~{it.hours} часов</small></div>
                                                    </li>)
                                                })}
                                            </ul>
                                        </div>
                                        <div className="ul-wrap">

                                            <strong>{t('potentialProblems')}</strong>
                                            <ul>
                                                {(it.problems || []).map((it, ind) => {
                                                    return (<li key={ind}>
                                                        <div>{it.name}</div>
                                                        <div style={{padding: '3px 0'}}>{it.problem}</div>
                                                        <div style={{paddingLeft: '0px'}}>
                                                            <div>
                                                            </div>
                                                            <div>
                                                                <div
                                                                    style={{opacity: .4}}
                                                                    className="fa fa-check"></div>
                                                                {it.solution}</div>
                                                        </div>
                                                    </li>)
                                                })}
                                            </ul>
                                        </div>


                                    </div>)
                                })}


                            </div>}
                        </div>

                    </div>
                </div>
            </div>
        </div>
        <div className="col-sm-4 sticky">
            <div className='card '>
                <div className='card-body '>

                    {(projects || []).map((it, ind) => {
                        return (<div
                            style={{padding: '10px 10px', cursor: 'pointer'}}
                            key={ind} className={(ind === selectedProjectInd ? 'activeLink' : '') + ''}
                            onClick={() => setSelectedProjectInd(ind)}>
                            {it.name}
                        </div>)
                    })}
                </div>
            </div>
        </div>
    </div>
}

export default Layout2
