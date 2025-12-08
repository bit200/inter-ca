import React, {useState, useEffect} from 'react';
import _ from 'underscore';

import {
  Link, Outlet
} from "react-router-dom";
import './MyTable.css'

function MyTable(props) {
  let [filter, setFilter] = useState({
    sort: 'name',
    perPage: 3,
    search: '',
    direction: 'desc',
    // filter: {_id: 1061}
    })
 //console.log('*........ ## ROOT RENDER', props);

  return <div>
    <small>Direction</small>
    <input value={filter.direction}
           onChange={(e)=> setFilter({...filter, direction: e.target.value, page: 1})} />
    <small>Sort</small>
    <input value={filter.sort}
           onChange={(e)=> setFilter({...filter, sort: e.target.value, page: 1})} />
    <small>Search</small>
    <input value={filter.search}
           onChange={(e)=> setFilter({...filter, search: e.target.value, page: 1})} />
    <small>Filter Id</small>
    <input value={(filter.filter || {})._id}
           onChange={(e)=> setFilter({...filter, filter: {_id: e.target.value}, page: 1})} />
    <Table
        Head={HeadComp}
        Body={BodyComp}
        EmptyItems={Empty}
        NothingFound={NothingFound}
        // apiUrl={'http://212.8.247.141:6017/api/subject'}
        apiSearchFileds={['name']}
        onFilter={(it, filter) => {
          filter = filter || {}
          if (filter._id) {
            return it._id == filter._id
          }
          return true;
        }}
        onSearch={(it, reg) => {
          return reg.test(it.name)
        }}
        onChangeFilter={(v) => {
          setFilter(v)
        }}
        filter={filter}
        items={[{name: '1 5555', _id: 1}, {name: '2 124'}, {name: '3 aaaaaa'}]}
    ></Table>
  </div>
}

function Empty() {
  return <div>Empty</div>
}
function NothingFound() {
  return <tr><td colSpan={1000} className={'nothing-found'}>Nothing Found ....</td></tr>
}

function Searchify(props) {
  let {value, search} = props;

  if (!search) {
    return value;
  }
  let reg =  new RegExp(search, 'gi');
  value = (value || '').replace(reg, it => {
    return `<strong class="hover-search">${it}</strong>`
  })
  return <div dangerouslySetInnerHTML={{__html: value}}></div>
}
function BodyComp(props) {
  let {ind, item, search} = props;
  return  <tbody key={ind}>
    <tr>
      <td>
        <Searchify search={search} value={item.name}></Searchify>
      </td>
      <td>444455 {item._id}</td>
    </tr>
    </tbody>
}

function HeadComp(props) {
  return <><thead>
    <tr><td>Head1</td><td>Head2</td></tr>
  </thead></>
}

function Table(props) {
  let {Head, Body, EmptyItems, NothingFound, apiSearchFields, apiUrl, onChangeFilter, onFilter, onSearch, filter} = props;

  let [stateItems, setItems] = useState([]);
  let [stateTotal, setTotal] = useState(0);
  let {page, search, perPage} = filter || {};
  let reg = new RegExp(search, 'gi')

  page ??= 1;


  useEffect(() => {
    if (!apiUrl) {
      return;
    }
    function getFilterStr (data) {
      return Object.keys(data || {}).map(key => {
        return data[key] ? `filter[${key}]=${encodeURIComponent(data[key])}` : '';
      }).filter(it => it).join('&');
    }


    const queryString = new URLSearchParams({
      search: filter.search,
      page: page,
      per_page: filter.perPage,
      sort: filter.search || '_id',
      direction: filter.direction || 'desc',
    }).toString()
        + '&' + (filter.apiSearchFileds || ['name']).map((filter, index) => `filters[${index}]=${encodeURIComponent(filter)}`).join('&')
    + '&' + getFilterStr(filter.filter);

    fetch(apiUrl + '?' + queryString)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(({data}) => {
         //console.log('data api url', data);
          setItems(data.items)
          setTotal(data.total)
        })
        .catch(error => {
          console.error('There was a problem with the fetch operation:', error.message);
        });

  }, [apiUrl, JSON.stringify(filter)])

  let items = apiUrl ? stateItems : props.items
  let filteredItems = items.filter(it => {
    return onFilter(it, filter.filter) && (!search || onSearch(it, reg));
  })
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const visibleItems = apiUrl ? items : filteredItems.slice(startIndex, endIndex)
  let  total = apiUrl ? stateTotal : items.length;

  if (!total) {
    return <EmptyItems></EmptyItems>
  }
  return <>
    My Table: {total} <pre>{JSON.stringify(filter, null, 4)}</pre>

    <table border={1} className={'table table-bordered table-stripped'}>
    <Head></Head>
    {(visibleItems || []).map((it, ind) => {
        return (<Body item={it} ind={ind} search={search}>
        </Body>)
    })}
    {!visibleItems.length && <tbody><NothingFound /></tbody>}
  </table>
    <Pagination page={page} onChange={(page) => {
      onChangeFilter({...filter, page})
    }}></Pagination>

  </>
}

function Pagination ({page, onChange}) {
    let arr = [1,2,3,4,5,6,7,8,9,10]
    return (arr || []).map((it, ind) => {
        return (<div key={ind} className={'ib ' }
                      onClick={() => {onChange(ind + 1)}}
                     style={{padding: '10px', background: (ind == page -1 ? 'grey' : '')}}>
          {ind + 1}
        </div>)
    })


}


export default MyTable
