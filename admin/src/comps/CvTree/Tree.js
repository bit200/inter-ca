import React, {useEffect, useState} from 'react';
import _ from 'underscore';
import './tree.css'
import {
    Link, Outlet
} from "react-router-dom";
import MdPreview from '../Suggest/MdPreview';
import FindDuplicate from './FindDuplicate';
import MyImg from "../MyImg";

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);
    let [compObj, setCompObj] = useState({});
    let [parentObj, setParentObj] = useState({});
    let [loading, setLoading] = useState(true);
    let [previewItem, setPreviewItem] = useState(null);

    useEffect(() => {
        let isSync = true || props.syncComponents

        if (isSync) {
            global.http
                .get('/all-components', {})
                .then(comps => {
                    global.components = comps;

                    let obj = {};
                    let parentObj = {};

                    let allIds = {}
                    _.each(comps, (item, ind) => {
                        let parentId = item._id;
                        allIds[item._id] = true;
                        obj[parentId] = item;

                        _.each(item.childs, (child, ind) => {
                            let child_id = child._id || child;
                            parentObj[child_id] = parentObj[child_id] || []
                            parentObj[child_id].push(parentId)
                        })

                    })
                    _.each(parentObj, (item, ind) => {
                        delete allIds[ind]
                    })
                    parentObj['-1'] = Object.keys(allIds).map(Number)

                    global.compObj = obj;
                    global.parentObj = parentObj;
                    next()

                })
        } else {
            if (!global.components) {
                //console.log("not found components")
                global.onComponentsSync = () => {
                    next()
                }
            } else {
                next()
            }
        }


        function next() {
            setCompObj(global.compObj)
            setParentObj(global.parentObj)
            setLoading(false)
        }
    }, [])

    if (loading) {
        return <div className={'w100 tc loading'}>{t('loading')} ...</div>
    }

    function onOpen(it) {
        setPreviewItem({})
        setTimeout(() => {
            setPreviewItem(it)
        }, 1)

    }

    previewItem = previewItem || {}
    // let v = useActionData();
    //console.log("isDesc previewItem", previewItem)

    function getBreadcrumbs(item) {
        if (!item || !item._id) {
            return []
        }
        let _id = item._id;
        let {components, compObj, parentObj} = global;
        //console.log("qqqqq list", components, compObj, parentObj,);
        console.clear();
        let BREADCRUMBS = [];

        let count = 0;

        function onPush(arr, isCicle) {
            BREADCRUMBS.push({arr, isCicle})
        }

        function gen(parentId, currentBreadcrumb, obj) {
            if (++count > 100000) {
                return;
            }

            let arr = (parentObj || {})[parentId] || [];
            if (!arr.length) {
                onPush(currentBreadcrumb)
            }
            //console.log('parentId', { parentId, arr, currentBreadcrumb, obj })
            _.each(arr, (_id, ind) => {
                if (obj[_id]) {
                    return onPush([...currentBreadcrumb, _id], true)
                }
                gen(_id, [...currentBreadcrumb, _id], {...obj, [_id]: true})
            })
        }

        gen(_id, [_id], {[_id]: true})

        //console.log("parentId final", BREADCRUMBS)

        return BREADCRUMBS;
    }


    let isAdmin = !!global.user.get_id();//window.location.href.indexOf('/temp/features-tree') < 0
    let deetails = ''
    let hoursStr = [previewItem.timeFrom, previewItem.timeTo].filter(it => it).join('-');

    return <div className='row'>

        <div className='col-sm-8 sticky3'>
            <div className="card">
                <div className="card-body">

                    {!previewItem || !previewItem._id && <>
                        <div style={{
                            fontSize: '30px',
                            textAlign: 'center', padding: '50px 0'
                        }}>{t('emptySelect')}
                        </div>
                        <div className={'tc'} style={{padding: '20px'}}>
                            <MyImg>board</MyImg>
                        </div>
                    </>}

                    {previewItem && previewItem._id && <div>
                        {isAdmin && <>
                        <Link to={'/components/' + previewItem._id}>#{previewItem._id} {previewItem.name}</Link>
                            <div className='ib' style={{marginLeft: '20px'}}>
                                <FindDuplicate item={previewItem} items={global.components}></FindDuplicate>
                            </div>
                        </>}
                        {!isAdmin && <>
                            <div>{previewItem.name} Component #{previewItem._id} </div>
                        </>}
                        <div></div>

                        <Preview title={t('whatIsThis')} value={previewItem.desc}/>
                        <Preview title={t('forWhat')} value={previewItem.desc2}/>
                        <Preview title={t('avgTime')}
                                 postfix={hoursStr ? 'ч.' : ''}
                                 value={hoursStr}/>
                        <small><Preview
                            value={previewItem.timeStr}/></small>


                        {Boolean(previewItem.problems && previewItem.problems.length) &&
                            <div className='table-responsive'>
                                {/* <b><small>Потенциальные трудности</small></b> */}

                                <table className='table table-striped table-bordered'>
                                    <thead>
                                    <tr>
                                        <th>{t('potentialProblems')}</th>

                                        <th>{t('desc')}</th>
                                        <th>{t('potentialSolution')}</th>
                                    </tr>
                                    </thead>
                                    {previewItem.problems.map((it, ind) => {
                                        return <tbody className='row2' key={ind}>
                                        <tr>

                                            {/* <strong>{ind + 1}. {it.propblem}</strong>
            <div>Решение</div> */}
                                            <td className='col-sm-4'>
                                                {/* <small>Трудность </small> */}
                                                <div>{it.name}</div>
                                            </td>
                                            <td className='col-sm-4'>
                                                {/* <small>Трудность </small> */}
                                                <div>{it.problem}</div>
                                            </td>
                                            <td className='col-sm-4'>
                                                {/* <small>Потенц. решение </small> */}
                                                <div>{it.solution}</div>
                                            </td>
                                        </tr>
                                        </tbody>
                                    })}
                                </table>
                            </div>}
                        {Boolean(previewItem.ways && previewItem.ways.length) && <>
                            <div className='table-responsive'>
                                {/* <b><small>Потенциальные трудности</small></b> */}

                                <table className='table table-striped table-bordered'>
                                    <thead>
                                    <tr>
                                        <th>{t('potentialSteps')}</th>
                                        <th>{t('pluses')}</th>
                                        <th>{t('minuses')}</th>

                                    </tr>
                                    </thead>
                                    {previewItem.ways.map((it, ind) => {
                                        return <tbody className='row2' key={ind}>
                                        <tr>

                                            {/* <strong>{ind + 1}. {it.propblem}</strong>
            <div>Решение</div> */}
                                            <td className='col-sm-4'>
                                                {/* <small>Трудность </small> */}
                                                <div>{it.name}</div>
                                            </td>
                                            <td className='col-sm-4'>
                                                {/* <small>Трудность </small> */}
                                                <div>{it.props}</div>
                                            </td>
                                            <td className='col-sm-4'>
                                                {/* <small>Потенц. решение </small> */}
                                                <div>{it.cons}</div>
                                            </td>
                                        </tr>
                                        </tbody>
                                    })}
                                </table>
                            </div>
                            {/* <b><small>Потенциальные пути реализации</small></b>
        {previewItem.ways.map((it, ind) => {
          return <div className='row' key={ind}>
            <div className='col-sm-4'>
              <small>Способ </small>
              <div>{it.name}</div>
            </div>
            <div className='col-sm-4'>
              <small>Плюсы </small>
              <div>{it.props}</div>
            </div>
            <div className='col-sm-4'>
              <small>Минусы </small>
              <div>{it.cons}</div>
            </div>
          </div>
        })} */}
                        </>}

                        {/* <MdPreview size={20} title={'Дефолтное описание'} source={previewItem.desc}></MdPreview> */}

                        <hr/>
                        <strong>{t('esimationDetails')}</strong>
                        {['min', 'norm', 'max', ...previewItem.customKeys || []].map((key, ind) => {

                            let names = {
                                min: t('min'),//'Минимальная',
                                norm: t('mid'), //''Мид',
                                max: t('max'), //

                            }
                            let it = ((previewItem || {}).vars || {})[key] || {}
                            if (!it.hours && !it.desc) {
                                return <></>
                            }
                            deetails = true
                            return <>
                                <hr/>
                                <small>
                                    <b>
                                        {(names[key] || key) + ` версия. Hours: ${it.hours || '-'}`}
                                    </b>
                                </small>
                                <MdPreview source={it.desc}></MdPreview>
                                <div></div>
                            </>
                        })}
                        {!deetails && <div>{t('emptyLine')}</div>}

                        {previewItem && previewItem._id && <>

                            <div>
                                <hr/>
                                {t('breadCrumpVarients')}:
                                {getBreadcrumbs(previewItem).map(({isCicle, arr}) => {
                                    return <div className='breadcrumb-item'>
                                        {(arr || []).map((it, ind) => {
                                            let pit = compObj[it] || {}
                                            return (<a onClick={() => {
                                                onOpen(pit)
                                            }} key={ind} className={'ib breadcrumbit'}
                                                       style={{
                                                           opacity: isCicle && (ind === arr.length - 1) ? .4 : 1,
                                                           padding: '0 4px'
                                                       }}>
                                                {pit.name}
                                            </a>)
                                        })}


                                    </div>
                                })}
                            </div>

                            <>
                                <hr/>
                                <TreeView
                                    onOpen={onOpen}
                                    id={previewItem._id} deepLevel={1} breadcrump={[]} alreadyIn={{}}></TreeView>
                            </>

                        </>}
                    </div>}
                </div>
            </div>
        </div>
        <div className='col-sm-4 sticky3'>
            <TreeDirect onOpen={onOpen}></TreeDirect>
        </div>
    </div>
}

function Preview({title, value, postfix}) {
    if (!value) {
        return <></>
    }
    return <>
        <b><small>{title}</small></b>
        <div>
            {value}{postfix || ''}
        </div>
    </>
}

function TreeDirect(props) {
    let [search, setSearch] = useState('');
    let reg = new RegExp(search, 'gi');

    return <div className={'card'}>
        <div className={'card-body'}>
            <div className='tree-input'>
                <input
                    className={'form-control'}
                    placeholder={t('treeSearch') + " ..."}
                    value={search} onChange={(e) => setSearch(e.target.value)}/>
            </div>
            <hr/>
            <TreeView id={-1}
                      onOpen={props.onOpen}
                      reg={reg} deepLevel={0} breadcrump={[]} alreadyIn={{}}></TreeView>
        </div>
    </div>
}

function TreeView(props) {
    let {id, deepLevel, onOpen, reg, alreadyIn} = props;
    let it = global.compObj[id] || {}
    let ids = id == -1 ? global.parentObj[id] : ((it || {}).childs || []);

    let isAlreadyIn = alreadyIn[id];
    alreadyIn[id] = true

    let _title = it.name || it.title || ''

    function isSearch(_title) {
        return reg ? reg.test(_title) : true
    }

    function isDescFn(it) {
        function length(v) {
            return v && v.length;
        }

        if (it.desc || it.desc2 || length(it.ways) || length(it.problems) || length(it.snippets) || it.timeFrom || it.timeTo) {
            return true;
        }
        let isDesc = false;
        for (let key in it.vars) {
            if ((it.vars[key] || {}).desc) {
                return true;
            }
        }
        return false;
    }

    let _isSearch = isSearch(_title)
    let isDesc = isDescFn(it);


    return <div className={'tree-wrap'} data-deep-level={deepLevel}>

        {id > 0 && _isSearch && !props.isParentSearch && <div className='breadcrump'>
            {props.breadcrump.map((it, ind) => {
                return <a className={'label label-xs label-default'} onClick={() => {
                    onOpen(it)
                }}>{it.name || it.title}</a>
            })}
        </div>}
        {id > 0 && _isSearch && <a className={isDesc ? 'descYes' : 'descNo'} onClick={() => {
            onOpen(it)
        }}>{_title} {isAlreadyIn ?
            <small className={'label label-xs label-success'}>Уже в дереве - показать инфо</small> : ''}</a>}


        {(isAlreadyIn || deepLevel > 10 ? [] : (ids || [])).map((childId, ind) => {
            return (<div key={'tree_' + childId + '_' + ind}>
                <TreeView
                    onOpen={onOpen}
                    breadcrump={[...props.breadcrump, it]}
                    isParentSearch={_isSearch}
                    id={childId} reg={reg} deepLevel={deepLevel + 1} alreadyIn={alreadyIn}></TreeView>
            </div>)
        })}
        {/*{(!ids || !ids.length) && <div>NotFound</div>}*/}

    </div>

}


export {TreeDirect};
export default Layout2
