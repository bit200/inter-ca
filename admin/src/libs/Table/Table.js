import React from 'react'
import {Link, withRouter} from 'react-router-dom'
import http from './../http/http'
// import Spinner from '../Spinner/Spinner'
import m from './../m/m'
import MyModal from './../MyModal/MyModal'
import Smart from './../Smart'
import './table.css'
import TableFilter1 from './TableFilter1'
import TableFilter2 from './TableFilter2'
import Skeleton from "../Skeleton";
import MyImg from "../../comps/MyImg";

let timer = -1;
let _ = window._;
let $ = window.$;

class Table extends React.Component {

    constructor(props) {
        super(props);
        let opts = props.opts || {};
        window.table = this;
        // console.log('*........ ## opts', opts);
        let active_filter = {};
        let filter = opts.def_filter;
        _.each(filter, (it, key) => {
            active_filter[key] = {value: it}
        })

        this.state = {
            search: '',
            per_page: opts.per_page || 50,
            pointItem: {},
            sort: opts.sort || '_id',
            direction: opts.direction || 'desc',
            page: 1,
            data: [],
            items: opts.items,
            page_count: 0,
            loading: true,
            filter,
            active_filter
        };
        this.sub_id = this.props.sub_id;
        window.tt = this;
    }

    componentWillReceiveProps(a) {
        // console.log('*........ ## a', a);
        // if (a.items && (!this.state.data || !this.state.data.length)) {
        //   this.loadInfo(null, a);
        // }
        // this.setState({items: a.items});
        let search = (a.opts || {}).search;
        if ((this.state.search != search)) {
            this.onSearch(search)
        }
        if (this.sub_id != a.sub_id) {
            this.sub_id = a.sub_id;
            this.setParams({page: 1, search: '', fade: true})
        }
        this.loadInfo()
    }


    onChange(item) {
        if (!item) {
            return;
        }
        let data = this.state.data;

        if (item.is_removed) {
            data = _.filter(data, it => {
                return it._id !== item._id
            })
        } else {
            let is_found;
            _.each(data, it => {
                if (it._id && it._id === item._id) {
                    is_found = true;
                    it = _.extend(it, item)
                }
            });
            if (!is_found && item.is_new_el) {
                data.unshift(item)
            }
        }
        this.setState({data})
    }

    preLoaderFunc(val) {
        return (val && <span className={'afade'}>Загружаем данные ...
            <Skeleton woLabel={true} count={1}></Skeleton>
        </span>);
    }


    changeOrder(key, direction) {
        let _key = this.state.sort;

        let obj = {
            filter: this.state.filter,
            active_filter: this.state.active_filter,
            sort: key,
            direction: direction || (_key === key && this.state.direction === 'desc' ? 'asc' : 'desc')
        }
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
        if (obj.fade) {
            let $el = $(this.refs.main_el)
            // console.log('........ ## $l', $el, this.refs, this.refs.main_el);
            $el.removeClass('afade')
            setTimeout(() => {
                $el.addClass('afade')
            }, 100)
        }
        if (this.searchValidation(obj) === true) this.loadInfo(obj);
    }

    searchValidation(_obj) {
        // let reg = new RegExp(/(#|!|\?|%|\d|\s{2}|^\s|\$|\\|\/|\\+|-|=|'|~|`|"|\|\(|\)|\*|&|\^|:|;|>|<|,|№|\[|]|{|})/);
        // return (!reg.test(_obj.search));
        return true
    }

    onSearch(value) {
        // let value = event.target.value
        this.setState({search: value})
        clearTimeout(timer)
        timer = setTimeout(() => {
            this.setParams({
                search: value, page: 1,
                filter: this.state.filter,
                active_filter: this.state.active_filter
            })
        }, this.props.items ? 0 : 400)
    }

    perPageChanged(event) {
        this.setParams({per_page: event.target.value})
    }

    filterify(obj) {
        return _.extend({}, obj, {
            filter: this.state.filter,
            active_filter: this.state.active_filter
        })
    }

    handlePageClick(page) {
        let obj = this.filterify({page: +page.selected + 1, sort: this.state.sort, direction: this.state.direction});
        this.setState(obj);
        this.loadInfo(obj);
    }

    getUrl(str) {
        return (str || '').toLowerCase()
    }

    loadInfo(params, props) {
        params = params || {};
        let __params = {...params, active_filter: this.state.active_filter, search: this.state.search}
        // window.location.hash = '#' + JSON.stringify(params);
        let size = _.size(__params);

        if (!this.props.woHash) {
            window.history.replaceState(undefined, undefined, window.location.pathname + (size ? ('#' + JSON.stringify(__params)) : ''))
        }

        // console.log("qqqqq params22222", params);
        let {search, per_page, total, page, sort, direction} = this.state,
            user_id = this.props.user_id,
            obj = {
                search,
                per_page,
                page: params && !!Number(total) && params.per_page > Number(total) ? 1 : page,
                sort,
                direction
            };

        if (user_id) {
            obj.user_id = user_id;
        }
        let sub_id = this.sub_id;
        let _params = _.extend({}, params || {});
        let top_filters = this.get_top_filters();

        // console.log('*........ ## _paramsssssssssss', _params, top_filters);


        _.each(_params.filter, (it, key) => {

            let top_filt = _.filter(top_filters, it2 => {
                return it2 && (it2.key === key);
            })[0]
            // console.log('*........ ## top_filter', top_filt, it, key);

            if (top_filt && top_filt.fn) {
                _params.filter[key] = top_filt.fn(it) || it;
            }
        })
        let query = Object.assign(obj, _params || {}, {sub_id: sub_id || ''});

        this.setState({loading: true});

        let {tabs = []} = this.props.opts || this.props || {};

        query.filters = this.props.filters || (this.props.opts || {}).filters || _.filter(_.map(tabs, tab => {
            return tab && !tab.wo_filter && !tab.wo_search ? tab.key : ''
        }), it => it);


        let {opts} = (props || this.props || {});
        let items = this.props.items || (props || {}).items
        //console.log("qqqqq itemsssss", items, this.props);
        if (!opts || items) {

            let fitems = items.filter((it, ind) => {
                return toFilter(query.search, it, query.filters, query);
            }).sort((it1, it2) => {
                if (query.sort) {
                    let v = it1[query.sort] > it2[query.sort];
                    v = query.direction === 'desc' ? v : !v;
                    return v ? -1 : 1
                }
            })


            let {page, per_page} = query;

            let total = fitems.length;
            this.setState({
                data: paginate(fitems, per_page, page),//(fitems || []).splice(page),
                total,
                page_count: Math.ceil(total / per_page),
                page: query.page,
                loading: false,

            });
            return;
        }
        http.get(this.props.opts.url, query, {progress: true})
            .then(r => {
                this.setState({
                    data: opts && opts.pre_get ? _.map(r.items, opts.pre_get) : r.items,
                    total: r.total,
                    page_count: Math.ceil(r.total / query.per_page),
                    page: query.page,
                    loading: false
                });
                this.props.cb();
            })
            .catch(() => {
                this.setState({loading: false});
                // this.props.cb();
            });


        function paginate(array, page_size, page_number) {
            // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
            return array.slice((page_number - 1) * page_size, page_number * page_size);
        }

        function toFilter(search, item, arr, q) {
            if (!q.search) {
                return true;
            }
            let reg = new RegExp(q.search);
            let is_ok = false;
            _.each(arr, (it, ind) => {
                is_ok = is_ok || reg.test(item[it])
            });
            return is_ok;
        }
    }


    post(obj) {
        let url = this.props.opts.url;


        // console.log("post", this.props, url)
        http.post(this.props.opts.url, obj, {progress: true})
            .then(r => {
                // this.setState({
                //   data      : opts && opts.pre_get ? _.map(r.items, opts.pre_get) : r.items,
                //   total     : r.total,
                //   page_count: Math.ceil(r.total / query.per_page),
                //   page      : query.page,
                //   loading   : false
                // });
                // this.props.cb();
                this.setState({open: false})
                this.loadInfo();
                this.props.opts.onCreate && this.props.opts.onCreate();
            })
            .catch(() => {
                this.setState({loading: false});
                // this.props.cb();
            });
    }

    put(obj) {
        http.put(this.props.opts.url, {item: obj}, {progress: true})
            .then(r => {
                this.setState({open: false})
                // this.setState({
                //   data      : opts && opts.pre_get ? _.map(r.items, opts.pre_get) : r.items,
                //   total     : r.total,
                //   page_count: Math.ceil(r.total / query.per_page),
                //   page      : query.page,
                //   loading   : false
                // });
                // this.props.cb();
                this.loadInfo();
            })
            .catch(() => {
                this.setState({loading: false});
                // this.props.cb();
            });
    }

    getDetails(item, field) {
        field = field || 'details'
        item = item || {}
        let r = item[field];
        try {
            r = JSON.stringify(JSON.parse(r), null, 2)
        } catch (e) {
            r = item[field]
        }
        return r || '-'
    }


    componentDidMount() {
        let str = decodeURI(window.location.hash || '').replace('#', '');
        let hashObj;
        try {
            hashObj = JSON.parse(str);
            this.setState(hashObj, () => {
                this.loadInfo(hashObj)
            });
        } catch (e) {
            this.loadInfo({})

        }


    }

    openPoint(pointItem) {
        if (!pointItem || !pointItem._id) {
            this.setState({open: true, pointItem})
        } else if (this.props.onSelect) {
            this.props.onSelect && this.props.onSelect(pointItem)
        } else if (this.props.woModal) {
            global.navigate(window.location.pathname + '/' + pointItem._id)
        } else {
            this.setState({open: true, pointItem})
        }
    }

    onAdd(v) {
        this.openPoint(_.extend({}, this.props.opts.on_add_obj, v))
    }


    closeModal() {
        this.setState({pointItem: false, open: false})
    }

    changeFilter(active_filter, filter_key) {
        let _active_filter = this.state.active_filter || {};
        _active_filter[filter_key] = active_filter;

        // console.log('*........ ## aaaaaaaaa', );
        this.setState({active_filter: _active_filter});
        let obj = {filter: {}};
        _.each(_active_filter, (it, key) => {
            // console.log('*........ ## xxxxxxxxxxx', it, key);

            if (it && it.value) {
                obj.filter[key] = it.value || it
            } else if (typeof it !== 'object' &&
                !Array.isArray(it)) {
                obj.filter[key] = it;

            }
        });

        // console.log('*........ ## obbjjjjjjjjj', obj.filter, _active_filter);
        obj.page = 1;

        this.setParams(obj)
    }

    get_top_filters() {
        let {top_filters, cd_key = 'cd', top_dates} = this.props.opts || {};
        return (top_dates ? [
            {
                key: cd_key,
                def_name: 'All',
                def_value: 'pending',
                fn: (v) => {
                    var start = new Date();
                    start.setHours(0, 0, 0, 0);
                    start = start.getTime();
                    let day = 24 * 3600 * 1000;

                    if (v === '_1d') {
                        return {$gte: start}
                    } else if (v === '_2d') {
                        return {$gte: start - day, $lte: start}
                    } else if (v === '_3d') {
                        return {$gte: start - 2 * day, $lte: start - 1 * day}
                    } else if (v === '3d') {
                        return {$gte: start - 2 * day}
                    } else if (v === '7d') {
                        return {$gte: start - 6 * day}
                    } else if (v === '30d') {
                        return {$gte: start - 29 * day}
                    }

                },
                arr: [{name: '_1d', value: '_1d'}, {name: '_2d', value: "_2d"}, {
                    name: '_3d',
                    value: "_3d"
                }, {name: '3d', value: "3d"}, {name: '7d', value: "7d"}, {name: '30d', value: "30d"}]
            }
        ] : []).concat(top_filters)

    }

    render() {

        let Icons = () => {
                return <div className="pull-right icons-table">
                    <i className="fa fa-sort"></i>
                    <i className="fa fa-sort-amount-asc" aria-hidden="true"></i>
                    <i className="fa fa-sort-amount-desc" aria-hidden="true"></i>
                </div>
            },
            {
                page,
                per_page,
                page_count,
                search,
                points_history,
                loading,
                direction,
                sort,
                data,
                total,
                active_tab,
                active_filter = {}
            } = this.state;
        let {
            tabs_opts = {},
            TopComp,
            top_filters = [],
            own_top = [],
            class_fn,
            tabs = [],
            tabsTitle
        } = this.props.opts || {};
        // console.log("qqqqq this.props.opts || {};this.props.opts || {};this.props.opts || {};", this.props.opts || {});

        top_filters = this.get_top_filters();

        let point = this.state.pointItem;
        tabs = global._.map(tabs, it => {
            if (!it) {
                return {};
            }
            if (!it.name) {
                let name = it.key || '';
                it.name = name.charAt(0).toUpperCase() + name.slice(1)
            }
            return it;
        });


        let {edit, create, modalSize} = this.props.opts || {};

        let {open} = this.state;
        let Comp = tabs_opts.component || this.props.Component;

        let TF1 = this.props.TableFilter1 || TableFilter1;
        let TF2 = this.props.TableFilter2 || TableFilter2;
        let opts = this.props.opts || {};
        // let is_new_point = point._id;
        //console.log("qqqqq data22222", data);
        return <div className={'animChild'}>

            {/*{page_count}*/}
            {edit && <MyModal
                isOpen={open}
                title={point._id || 'Создать запись'}
                opts={this.props.opts}
                size={modalSize}
                onClose={() => {
                    this.setState({open: false})
                }}
                // size={opts.modal_size}
                ref={(el) => this.modal = el}
            >
                <Smart
                    items={(create || edit || tabs || []).concat({
                        type: 'btn',
                        className: 'btn-sm',
                        icon: 'iconoir-double-check',
                        size: 'sm',
                        name: window.nameFn(point._id ? 'Save' : 'Create'),
                        onClick: (_obj) => {
                            let obj = this.state.pointItem;
                            // console.log('*....create .... ## vvvv', point, obj);
                            point._id ? this.put(obj) : this.post(obj)
                        }
                    })}
                    obj={point}
                    onChange={(v) => {
                        // console.log('*........ ## on change !!!!!!!', v);
                        // this.v = v;
                        this.setState({pointItem: point})
                    }}
                ></Smart>
            </MyModal>}


            <>
                <div className="card-header">
                    {tabsTitle && <div className={'row align-items-center'}>
                        <div className="col">
                            <div className="card-title">
                                {NameFn(tabsTitle)}
                            </div>
                        </div>
                    </div>}
                </div>

                <div className="card-body pt-0">
                    <div className="table-responsive">
                        <div
                            className="datatable-wrapper datatable-loading no-footer sortable searchable fixed-columns">
                            <div className="datatable-top">
                                <TF1
                                    data={data}

                                    total={total}
                                    per_page={per_page}
                                    page_count={page_count}
                                    page={page}
                                    search={search}
                                    woAdd={this.props.opts.woAdd}

                                    onPage={this.handlePageClick.bind(this)}
                                    onPerPage={this.perPageChanged.bind(this)}
                                    onChangeFilter={this.changeFilter.bind(this)}
                                    onSearch={this.onSearch.bind(this)}
                                    onAdd={this.onAdd.bind(this)}
                                    onChangeOrder={this.changeOrder.bind(this)}

                                    own_top={own_top}
                                    top_filters={top_filters}
                                    active_filter={active_filter}
                                ></TF1>

                                <div>
                                    {this.props.children}
                                </div>

                                {!!TopComp && <div>
                                    <TopComp></TopComp></div>}

                                {!!Comp && <>
                                    {(!!data && data).map((item, ind) => {
                                        return (<div key={ind} onClick={() => {
                                            opts.onClickItem && opts.onClickItem(item)
                                        }}>
                                            <Comp item={item} onAdd={this.onAdd.bind(this)} _this={this}
                                                  _ind={ind}></Comp>
                                        </div>)
                                    })}

                                    <tr>
                                        {this.preLoaderFunc(loading)}
                                    </tr>
                                    {!data.length && <tr>
                                        <div className={'tc'}>
                                            {this.preLoaderFunc(loading)}
                                            {!loading && <Nimg></Nimg>}
                                        </div>
                                    </tr>
                                    }
                                    <hr/>
                                </>}
                            </div>
                            {!Comp && <div className={'datatable-container'}>
                                <table cellPadding="1" cellSpacing="1"
                                       ref="main_el"
                                       className={`animChild table datatable datatable-table ${loading ? 'opacity-loading-td' : ''}`}>
                                    <thead>
                                    <tr>
                                        {tabs.map((tab, index) => {
                                            return (
                                                !tab.special_type ? <th
                                                    aria-sort={sort == tab.key ? (direction + 'ending') : ""}
                                                    key={'th-' + index}
                                                    data-sortable={true}
                                                    // className={` ${sort === tab.key ? direction : ''}`}
                                                    onClick={() => {
                                                        this.changeOrder(tab.key)
                                                    }}>
                                                    <button className="datatable-sorter">
                                                        {NameFn(tab.key)}
                                                    </button>
                                                </th> : <th key={'th-' + index}>
                                                    {NameFn(tab.key)}
                                                </th>
                                            );
                                        })
                                        }
                                    </tr>
                                    </thead>

                                    <tbody className={'animChild'}>
                                    {!!data && data.map((point, index) => {


                                        return <tr key={'data-' + index}
                                                   onClick={() => {
                                                       opts.onClickItem && opts.onClickItem(point)
                                                   }}
                                                   className={(class_fn ? class_fn(point) : '') + (point.is_removed ? ' opacity-removed' : '')}
                                            // onClick={() => {
                                            //   onItemClick(item)
                                            // }
                                            // }
                                        >
                                            {tabs.map((tab, index) => {
                                                function getV(value, items) {
                                                    let vv = _.filter(items, it => {
                                                        return it.value === value
                                                    })
                                                    return vv[0] ? vv[0].name : value;
                                                }


                                                let is_searchable = tab.is_searchable;
                                                let key = tab.key;
                                                let arr = (key || '').split('.');
                                                let keys = tab.keys || arr;
                                                let type = tab.type || 'text';
                                                let value = keys ? global.m.get_deep(point, keys) : point[key];
                                                let items = tab.items;

                                                value = items ? getV(value, items) : value

                                                let component_name = tab.component_name;
                                                let Component = m.get_component(component_name) || tab.component
                                                return <td key={'tab-field-' + index} onClick={() => {
                                                    // console.log('*........ ## clickckckckck');
                                                    if (tab.link) {
                                                        let url = m.get_item_link_from_extracter(point._id);
                                                        // console.log('*........ ## url', url);
                                                        global.hist.push(url)

                                                    } else if (/main_link|text|array|date|arr/i.test(type) || Component) {
                                                        // console.log('*........ ## true');
                                                        this.openPoint(point)
                                                    }
                                                }}>
                                                    {is_searchable && <small onClick={(e) => {
                                                        e.stopPropagation()
                                                        this.setParams({
                                                            search: value,
                                                            page: 1,
                                                            filter: this.state.filter,
                                                            active_filter: this.state.active_filter
                                                        })
                                                        setTimeout(() => {
                                                            let el = global.$('.search_table_item')
                                                            el.focus && el.focus();
                                                            el.select && el.select();
                                                        }, 100)
                                                        return true;
                                                    }} className={'search_it'}>=></small>}
                                                    {type === 'text' && !Component && !tab.href &&
                                                        <span
                                                            className={tab.className || ''}>{global.env.nameFn(value)}</span>}
                                                    {type === 'array' || type === 'arr' &&
                                                        <span>{(value && value.map ? value : []).map((item, ind) => {
                                                            return (<div key={ind} className={"ib mr-5"}>
                                                                <span>{item}</span>
                                                            </div>)
                                                        })}</span>}
                                                    {type === 'main_link' &&
                                                        <div>
                                                            <Link onClick={(e) => {
                                                                e.stopPropagation();
                                                                return null
                                                            }} to={m.get_item_link_from_extracter(point._id)}
                                                                  className={'main_link'}>{value}</Link>
                                                        </div>}
                                                    {(type === 'href' || tab.href) &&
                                                        <span> <a target="_blank"
                                                                  href={((tab || {}).href || value || '').replace(/(\#\#)(.+?)(\#\#)/gi, (...args) => {
                                                                      return point[args[2]]
                                                                  })}>{value}</a></span>}
                                                    {(type === 'rank' || tab.href) &&
                                                        <span> {value > 1000 ? Math.round(value / 1000) : value > 1 ? ('= ' + value + ' =') : '-'}</span>}
                                                    {(type === 'domain_href' || tab.href) &&
                                                        <span> <a target="_blank"
                                                                  href={'https://' + (tab.href || value || '').replace(/(\#\#)(.+?)(\#\#)/gi, (...args) => {
                                                                      return point[args[2]]
                                                                  })}>{value}</a></span>}
                                                    {type === 'date' &&
                                                        <span className={'tableDate'}>{m.date_time(value)}</span>}
                                                    {type === 'day' &&
                                                        <span className={'tableDay'}>{m.date(value)}</span>}
                                                    {Component &&
                                                        <Component item={point} value={value} _key={key}></Component>}


                                                </td>
                                            })}
                                        </tr>
                                    })
                                    }
                                    {!data.length && <tr>
                                        <td colSpan="100%"
                                            className={`text-center nothing-found ${loading && 'relative-td'}`}>
                                            {this.preLoaderFunc(loading)}
                                            {/*{!loading && }*/}
                                            {!loading && <Nimg></Nimg>}

                                        </td>
                                    </tr>
                                    }

                                    </tbody>
                                </table>
                            </div>}
                        </div>
                    </div>

                    <div className="datatable-bottom">
                        <TF2
                            data={data}

                            total={total}
                            per_page={per_page}
                            page={page}
                            page_count={page_count}
                            search={search}

                            onPage={this.handlePageClick.bind(this)}
                            onPerPage={this.perPageChanged.bind(this)}
                            onChangeFilter={this.changeFilter.bind(this)}
                            onSearch={this.onSearch.bind(this)}
                            onAdd={this.onAdd.bind(this)}

                            own_top={own_top}
                            top_filters={top_filters}
                            active_filter={active_filter}
                        ></TF2>
                    </div>
                </div>

                <div className="clearfix"></div>
            </>
        </div>
    }

}
function Nimg () {
    return <div style={{marginTop: '10px'}}>
        <MyImg w={300}>404</MyImg>
        <div style={{marginTop: '20px'}}>
            <span>{t('nothingFound')} ...</span>
        </div>
    </div>
}


// global.Table = Table;

export default Table
