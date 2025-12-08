import * as React from 'react';
import {useState} from 'react';
import './tree.css';


let _ind = 0;
let trees = {
  1 : {title: 'node 1', childs: [24, 28]},
  2 : {title: 'node 2', childs: [25]},
  24: {title: 'node 24', childs: []},
  // 25: {title: 'node 25', childs: []},
  25: {title: 'node 25', childs: [88]},
  28: {title: 'node 28', childs: []},
  88: {title: 'node 88', childs: [99]},
  99: {title: 'node 99', childs: [100]},
  100: {title: 'node 100', childs: []},
};

global.trees = trees;
function TreeIt(props) {
  // let trees = props.trees;
  let parentIds = props.parentIds //|| [1, 2];
  // props.alreadyObj = props.alreadyObj || {};

  return (parentIds || []).map((id, ind) => {
    let it = global.trees[id];

    // console.log('*........ ## it');
    return ((!it) ? <div>-- {id}</div> : <div
      className={'tree-child '} onClick={(e) => {
      props.onClick && props.onClick(id);
      e.preventDefault();
      e.stopPropagation();
      return true;
    }}>
      {/*{it.title}*/}
      <div className={(props.selectedId == id ? 'selected' : '')}>{id}</div>
      {(it.childs || []).map((childId, ind) => {
        // console.log('*........ ## childid', id, childId, parentIds, it);
        return (<div key={childId}>
          <TreeIt parentIds={[childId]}
                    // trees={props.trees}
                    selectedId={props.selectedId}
                    onClick={props.onClick}
          ></TreeIt>
        </div>)
      })}
    </div>)
  })
}

export default function Tree(props) {
  let [selectedId, setSelectedId] = useState(-1);

  return (
    <div className={'trees'}>
      {selectedId}
      <TreeIt
        // trees={trees}
                selectedId={selectedId}
                parentIds={[1,2]}
                onClick={(id) => {
                  // console.log('*........ ## on clickc', id);
                  setSelectedId(id);
                  props.onClick && props.onClick(id)
                }}/>
    </div>
  );
}
