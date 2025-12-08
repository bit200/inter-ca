import React from 'react'
import http from './../http/http'

class Table2 extends React.Component {

  constructor(props) {
    super(props);
    this.state = {search: '', per_page: 10, sort: 'id', direction: 'desc', page: 1, data: [], page_count: 0, loading: true};
  }

  preLoaderFunc(val) {
    return (val && <div>Loading...</div>);
  }


  componentDidMount() {
    this.loadInfo()
  }

  _loadInfo(url, params) {
    let query = Object.assign({
      per_page: this.state.per_page ,
      page: params && !!Number(this.state.total) && params.per_page > Number(this.state.total)? 1 : this.state.page
    }, params || {});
    this.setState({loading: true});

    if (this.state.search && this.state.search.trim() !== '') {
      query.search = params.search
    }

    // http.get('/v1/liabilities_by_retailers', query, {progress: true})
    http.get(url, query, {progress: true})
      .then(r => {
        this.setState({
          data: r.data,
          total: r.total,
          page_count: Math.ceil(r.total / query.per_page),
          page: query.page,
          loading: false
        });
        this.props.cb();
      })
      .catch(e => {
        this.setState({loading: false});
        this.props.cb();
      });
  }

  changeOrder(key) {
    let _key = this.state.sort;
    let obj = {sort: key, direction: _key === key && this.state.direction === 'desc' ? 'asc' : 'desc'}
    this.setState(obj);
    this.loadInfo(obj)
  }

  amount(v) {
    return '$' + (v ? v.toFixed(2) : '0').replace(/(\d)(?=(\d{3})+\.)/g, '$1,').replace('.00', '');
  }

  setParams(obj) {
    // obj.page = 1;
    obj.sort = this.state.sort
    obj.direction = this.state.direction
    this.setState(obj);
    if (this.searchValidation(obj) === true) this.loadInfo(obj);
  }

  searchValidation(_obj) {
    // let reg = new RegExp(/(#|!|\?|%|\d|\s{2}|^\s|\$|\\|\/|\\+|-|=|'|~|`|"|\|\(|\)|\*|&|\^|:|;|>|<|,|№|\[|]|{|})/);
    // return (!reg.test(_obj.search));
    return true
  }

  onSearch(event) {
    this.setParams({search: event.target.value, page: 1})
  }

  perPageChanged(event) {
    this.setParams({per_page: event.target.value})
  }

  handlePageClick(page) {
    let obj = {page: +page.selected + 1, sort: this.state.sort, direction: this.state.direction};
    this.setState(obj);
    this.loadInfo(obj);
  }


  getUrl(str) {
    return (str || '').toLowerCase()
  }

  render(){
    return <div></div>
  }
}

export default Table2
