import React from 'react';
import {WithContext as ReactTags} from 'react-tag-input';
import DeleteButton from "../DeleteButton/DeleteButton";
// import {ReactSortable} from "react-sortablejs";
let ReactSortable = function  () {

}

class SortableList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {search: '', confirm_item: null}
  }

  render() {
    let {items = [], onFilteredList, onRemove, woCreate, defItem, onChange, placeholder = 'Search ...', preventSearch, addCl = 'pull-right', addName = '+ Add', preventNothingFound, onFilter, Component, confirmRemove} = this.props;
    let {search, confirm_item} = this.state;
    let {ConfirmModal} = global;
    onChange = onChange || function _empty() {
    // console.log('*........ ## not defined on changed');
    }

    items = search ? global._.filter(items, it => {
      return onFilter({search, reg: new RegExp(search, 'gi'), item: it})
    }) : items;
    let {Button, Input} = global;

    onFilteredList && onFilteredList(items)


    return (
      <div>


        <div className={"col-xs-12 " + (preventSearch ? 'np' : '')}>

          <div className="pull-left">

          </div>
          {!preventSearch && <div className="pull-left">
            <Input value={search}
                   placeholder={placeholder}
                   wolabel={true}
                   onChange={(search) => {
                     this.setState({search})

                   }}/>
          </div>}
          {!woCreate && <div className={'ib'} style={{marginBottom: '10px'}}><Button className={addCl} color={1} onClick={(e) => {
            items.push(global._.extend({}, defItem || {}));
            onChange(items)
            e()
          }}>{addName}</Button></div>}
        </div>

        <ConfirmModal
          isOpen={!!confirm_item}
          item={{}}
          cb={() => {
          // console.log('*........ ## remove cbbbbbbbbbbbbb');
            this.confirm_cb && this.confirm_cb();
            this.setState({confirm_item: false})
          }}
          onClose={() => {
           this.setState({confirm_item: null})
          }}
          onSuccess={() => {
          // console.log('*........ ## removedddddddddddddddddddddddddddddddddddddd');
          }}
          opts={{}}
        >
        </ConfirmModal>
        <ReactSortable
          handle={".handle"}
          list={items}
          animation={200}
          setList={(newState) => {
          // console.log('*........ ## set list', newState);
            onChange(newState)
          // console.log('*........ ## zzzzzzzzzzzzzzzzz', newState);
          }}
        >
          {(items || []).map((item, ind) => {
            return (<div key={ind} className={'col-xs-12 ' + (this.props.cl_fn ? this.props.cl_fn(item, ind) : '')} onClick={(e) => {
              this.props.onClick && this.props.onClick(item, ind)
            }} >
              <div className="row">

                <div className="col-sm-12" style={{paddingLeft: '20px'}}>
                  <div className="handle" style={{position: 'absolute', left: 0}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-grip-vertical" viewBox="0 0 16 16">
                      <path
                        d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                    </svg>
                  </div>
                  <DeleteButton onClick={(e) => {
                    if (confirmRemove) {
                      this.confirm_cb = next;
                      this.setState({confirm_item: item})

                    } else {
                      next()
                    }

                    function next () {
                      items.splice(ind, 1)
                      onChange(items)
                      onRemove && onRemove(item)
                    }

                    e.preventDefault();
                    e.stopPropagation();
                    return true;

                  }}></DeleteButton>
                  <div className={''}>
                    {Component && <Component
                      onChange={(item) => {
                        items[ind] = item;
                        onChange(items);
                      }}
                      ind={ind}
                      it={item}
                      item={item}></Component>}
                  </div>
                </div>
              </div>


            </div>)
          })}
        </ReactSortable>


        {!preventNothingFound && items && !items.length && <small className={'mt10 col-xs-12 tc'}>Ничего не найдено</small>}
      </div>
    )
  }
};

global.SortableList = SortableList;

export default SortableList;
