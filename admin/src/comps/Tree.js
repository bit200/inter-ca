import * as React from 'react';
import {useState} from 'react';
import './tree.css';
import Storage from './Storage';
import _ from 'underscore';




function TreeIt(props) {
    let trees = Storage.getCategories();
    let {parentIds, searchReg, categoriesCount} = props //|| [1, 2];

    return (parentIds || []).map((id, ind) => {
        let it = trees[id];
        let isOk = searchReg ? searchReg.test(it.title) : true;

        let childs = _.sortBy(it.childs, child => {
            return (trees[child] || {}).title || '-'
        });

        return ((!it) ? <div>-- {id}</div> : <div
            className={'tree-child '} onClick={(e) => {
            props.onClick && props.onClick(id);
            e.preventDefault();
            e.stopPropagation();
            return true;
        }}>
            {isOk ? <div className={'tree-title ' + (props.selectedId == id ? 'selected' : '')}>{it.title || '---'}
                {((categoriesCount || {}).themeQuestions || {})[it._id] &&
                    <small> [x{categoriesCount.themeQuestions[it._id]} / x{categoriesCount.interviewQuestions[it._id]} {categoriesCount.emptyInterviewQuestions[it._id] && <span> / x{categoriesCount.emptyInterviewQuestions[it._id]}</span>}]</small>
                }</div> : null}
            {(childs || []).map((childId, ind) => {
                // console.log('*........ ## childid', id, childId, parentIds, it);
                return (<div key={childId}>
                    <TreeIt parentIds={[childId]}
                            categoriesCount={categoriesCount}
                            searchReg={searchReg}
                            selectedId={props.selectedId}
                            onClick={props.onClick}
                    ></TreeIt>
                </div>)
            })}
        </div>)
    })
}

export default function Tree(props) {
    let [search, setSearch] = useState('');
    let trees = Storage.getCategories();
    let {selectedId, categoriesCount} = props;

   //console.log("qqqqq ttttt", trees, categoriesCount);
    let parentIds = _.sortBy(_.filter(_.map(Object.keys(trees), (_id) => {
        return (trees[_id] || {}).parentId == -1 ? _id : null
    }), it => it), v => {
        return (trees[v] || {}).title
    });
    let searchReg = search ? new RegExp(search, 'gi') : null;

    return (
        <div className={'trees'}>
            <div className={props.defClassInput}>
                <input placeholder={'Поиск по категориям'} value={search} onChange={(e) => {
                    setSearch(e.target.value)
                }}/>
            </div>

            <div className={props.defClass}>
                {<div
                    onClick={(e) => {
                        props.onClick && props.onClick(-1)
                    }}
                    className={'tree-title ' + (props.selectedId == -1 ? 'selected' : '')}>{nameFn('all')}</div>}

                <TreeIt
                    categoriesCount={categoriesCount}
                    searchReg={searchReg}
                    selectedId={selectedId}
                    parentIds={parentIds}
                    onClick={(id) => {
                        props.onClick && props.onClick(id)
                    }}/>
            </div>
        </div>
    );
}
