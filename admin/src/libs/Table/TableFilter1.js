import React, {useState} from 'react'
import {Link, withRouter} from 'react-router-dom'
import http from './../http/http'
// import Spinner from '../Spinner/Spinner'
import m from './../m/m'
import MyModal from './../MyModal/MyModal'
import Smart from './../Smart'
import ReactPaginate from 'react-paginate';
import './table.css'
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

let timer = -1;
let _ = window._;
let $ = window.$;

class TableFilter1 extends React.Component {

  constructor(props) {
    super(props);

  }

  render() {


    // let  = this.props;
    let {
      items, TopComp, own_top, onPage, page_count,
      search, active_filter, onChangeFilter,
      woAdd,
      top_filters, per_page, page, data, total,
      onPerPage, onSearch, changeFilter, onChange, onAdd
    } = this.props;

    let woTableSelect = global.env.woTableSelect;
    return <>
      {!woTableSelect && <div className="pull-left">
        <div className="ib w-paging">
          <select className="form-control input-sm ib" value={per_page}
                  onChange={onPerPage}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="1000">1000</option>
          </select>

        </div>

        <small className="ib ml5"></small>

        {data.length !== 0 && <div className="mt5">
          <small>{NameFn('pageShort')} <b>{page}</b>; {NameFn('total')} <b>{total}</b>
          </small>
        </div>}
      </div>}

      <div className="mr10 ib">

        {(top_filters || []).map((filter, ind) => {
          if (!filter) {
            return <div></div>
          }
          if (filter.type === 'UserSelector') {
            return <UserFilterSelector {...this.props}/>
          }
          let filter_key = filter.key;

          let arr = filter.arr || [];
          let active_filter_item = active_filter[filter_key]
          return (<div key={ind} className={"ib mr-15 mbS " + ((woTableSelect && ind == 0) ? "" : "ml-15")}>
            {arr.length &&
                <button type="button" className={"btn btn-xs " + (!active_filter_item ? ' active btn-primary ' : '  btn-light')}
                        onClick={(e) => {
                          onChangeFilter(null, filter_key)
                        }}>{NameFn(filter.def_name || 'All')}</button>}

            {(arr || []).map((item, ind) => {
              active_filter_item = active_filter_item || {}
              active_filter_item.value = active_filter_item.key || active_filter_item.value;
              let key = active_filter_item.key || active_filter_item.value || '';
              // console.log("qqqqq keyeyeyeyeyeyye", key);
              return (<button
                  className={'btn btn-xs ' + (key === item.value ? 'active btn-primary' : 'btn-light ')}
                  key={ind} onClick={(e) => {
                onChangeFilter(item, filter_key)
              }}>
                {NameFn(item.value)}
              </button>)
            })}
          </div>)
        })}
      </div>
      <div className="btn-group btn-sm ml-15">


        <div className=" ib">

          {(own_top || []).map((item, ind) => {
            let {Component} = item;
            return (<div key={ind} className={'ib'}>
              <Component _this={this} onChange={() => {
                // console.log('*........ ## on Change top');
              }}></Component>
            </div>)
          })}          </div>
      </div>
      <div className="pull-right search-right-table">


        <div className="ib btn-group pull-right btn-search my-btn-search">
          <div className="input-group mt10">
            <input type="search" value={search} onChange={(e) => {
              onSearch(e.target.value)
            }}
                   // autoFocus={true}
                   className="search form-control search_table_item" placeholder={NameFn('search') + " ..."}/>

            {!woAdd && <span className="input-group-btn">
            <button className="btn btn-light" type="button" onClick={() => onAdd()}>+ {NameFn('addName')}</button>
            </span>}
          </div>


        </div>
      </div>
    </>
  }

}




function UserFilterSelector (props) {
  let [users, setUsers] = useState([]);
  let [alreadyLoading, setAlreadyLoading] = useState(false);
  let {active_filter,onChangeFilter, onChange} = props;
  let filter_key = 'user';
  if (!alreadyLoading) {
    setAlreadyLoading(true)
    getDBUsers(users => {
      setUsers(users)
    });
  }

  return <div className={"ib ml-15" } style={{marginTop: '-10px'}}>
    {!!users && !!users.length && <Autocomplete
        disablePortal
        id="combo-box-demo"
        options={users || []}
        value={( users || []).filter(it => active_filter[filter_key] == it._id)[0]}
        sx={{ width: 300 }}
        renderInput={(params) => <TextField {...params} label=" " />}
        onChange={(v1, v) => {
          let _id = v ? v._id : null;
          onChangeFilter(_id, filter_key)
          onChange && onChange(v, _id)
        }
        }
    />}
  </div>

}
function getDBUsers (cb) {
  global.http.get('/all-users', {})
      .then(items => {
        let _items =items.map(it => {
          return {_id: it._id, label: `${it.username} #${it._id}`}
        })
        cb && cb(_items)
      })
}



// global.Table = Table;

export default TableFilter1
