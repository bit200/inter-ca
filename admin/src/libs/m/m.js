import ParsePlainType from './../ParsePlainType/ParsePlainType';
import http from './../http/http';
import {Link, useNavigate} from "react-router-dom";

function pub(v) {
  return v < 10 ? '0' + v : v;
}
export function pub0(v) {
  v = v || 0
  return v < 10 ? '0' + v : v;
}

let LOGS = window.LOGS;
let _ = window._;

window.logs_count = {};
let logs_count = window.logs_count;

let logs_hist = []
let last_hist = 0
// setInterval(() => {
//   if (last_hist + 1000 < new Date().getTime()) {
//     last_hist = new Date().getTime() + 420 * 3600 * 1000;
//    // console.log'........ ## request');
//    // console.log'........ ## request');
//    // console.log'........ ## request');
//    // console.log'........ ## request');
//    // console.log'........ ## request');
//    // console.log'........ ## request');
//    // console.log'........ ## request');
//     http.post('/api/history-push', {logs: logs_hist})
//       .then(r => {
//        // console.log'........ ## request http posted', r);
//       })
//       .catch(e => {
//        // console.log'........ ## request catch error', e);
//       })
//     logs_hist = []
//   }
// }, 1000)

const m = {
  navigate(path) {


  },
  get_deep(item, keys) {
    _.each(keys, (it, ind) => {
      item = (item || {})[it]
    });
    return /string|number/.test(typeof item) ? item : item ? JSON.stringify(item) : keys.length > 1 ? '' : ''
  },
  // set_deep(item, keys, value) {
  //   _.each(keys, (it, ind) => {
  //     item = (item || {})[it]
  //   });
  //   return /string|number/.test(typeof item) ? item : item ? JSON.stringify(item) : keys.length > 1 ? '--' : ''
  // },
  round(v, num) {
    v = v || 0;
    if (num || num === 0) {
      return v && v.toFixed ? +v.toFixed(num) : 0
    } else {
      return v && v.toFixed ? +v.toFixed(10) : 0
    }
  },
  exec_js(s = '', name, cb) {
    s = s.replace(/##name_replacer##/gi, name)
    setTimeout(s, 1);
    setTimeout(cb, 100)
  }
  ,

  cog(...args) {
    let name = args[0];
    let name1 = args[1];
    let it = LOGS[name] || LOGS[name1];


    if (!LOGS.hasOwnProperty(name) && !LOGS.hasOwnProperty(name1)) {
      m.logs_count_fn(name, 'not_configured')
      // console.error('WRONG NAME ################', name)
      return;
    }

    if (!it) {
      m.logs_count_fn(name, 'false_value')
      return;
    }

    let name2 = LOGS[name] ? name : name1;

    if (it && it.fn) {
      let r = it.fn({args, logs_count})
      if (!r) {
        return null;
      }
    }


    let count = m.logs_count_fn(name, 'false_value')


    if (it.ind && it.ind.indexOf(count - 1) < 0) {
      // it.show_ind && console.log(name, ' ## wrong index ## ', count, it.ind)
      return;
    }

    let st = window.CURRENT_LOGS_STATUS || window.FORCE_LOGS_STATUS;

    if (st) {
      if (it.fields) {
        let _args = []
        _.each(args, (v, ind) => {
          if (!ind) {
            return _args.push(v)
          }


          _.each(it.fields, (key, ind) => {
            v = (v[key] || {})
          })


          _args.push('[ ' + it.fields.join('.') + ' ] = ')
          _args.push(v)

        })
        args = _args;
      }

      if (it.m) {
        m.log.apply(this, args)
      } else {
       //console.log.apply(this, args)
      }
    }
  }
  ,
  toObject(arr) {
    let obj = {}
    _.each(arr, (it, ind) => {
      obj[it] = true
    })
    return obj
  }
  ,
  each_if_cond(arr, fn, done_cb) {
    let is_found;
    _.each(arr, (it, ind) => {
      is_found = is_found || fn && fn(it, ind)
    })
    if (!is_found) {
      done_cb && done_cb()
    }
  }
  ,
  each_not_empty(arr, fn, empty_cb) {
    if (arr && arr.length) {
      _.each(arr, (it, ind) => {
        it && fn && fn(it, ind)
      })
    } else {
      empty_cb && empty_cb()
    }

  }
  ,
  each_fn(arr, fn, done_cb) {
    let ind = 0;
    let leng = _.size(arr)
    if (!leng) {
      return done_cb && done_cb()
    }
    _.each(arr, (it, _ind) => {
      fn && fn(it, _ind, () => {
        if (leng === ++ind) {
          done_cb && done_cb()
        }
      })
    })
  }
  ,
  each_fn_sync(arr, fn, done_cb) {
    let ind = -1;
    let leng = _.size(arr);
    if (!leng) {
      return done_cb && done_cb()
    }

    let keys = Object.keys(arr);

    let _arr = [];
    let _obj = {}

    function iter() {
      ++ind;

      let key = keys[ind];
      let it = arr[key]
      fn && fn(it, key, (r) => {

        _arr.push(r)
        _obj[key] = r;
        if (leng === ind + 1) {
          done_cb && done_cb(_arr, _obj)
        } else {
          iter()
        }
      })
    }

    iter()
  }
  ,
  logs_count_fn(name, field) {
    logs_count[name] = logs_count[name] || {}
    logs_count[name][field] = logs_count[name][field] || 0
    return ++logs_count[name][field]
  }
  ,
  is_object(A) {
    return ((typeof A === "object") && (A !== null))
  }
  ,
  on_change(_this, value, key) {

  }
  ,

  toQuery: function (obj, prefix) {
    var str = [],
      p;
    for (p in obj) {
      if (obj.hasOwnProperty(p)) {
        var k = prefix ? prefix + "[" + p + "]" : p,
          v = obj[p];
        str.push((v !== null && typeof v === "object") ?
          m.toQuery(v, k) :
          encodeURIComponent(k) + "=" + encodeURIComponent(v));
      }
    }
    return str.join("&");
  }
  ,

  parseQuery: function (queryString) {
    queryString = queryString || window.location.search;
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      let value = decodeURIComponent(pair[1] || '')
      query[decodeURIComponent(pair[0])] = value || value == 0 ? value : null;
    }

    _.each(query, (value, key) => {
      let arr = key.split('[')
      if (arr.length > 1) {
        let item = query;
        _.each(arr, (it, ind) => {
          it = it.replace(']', '')
          if (ind !== arr.length - 1) {
            item[it] = item[it] || {}
            item = item[it]
          } else {
            item[it] = value
          }
        })

        delete query[key];
      }

    })
    return query;
  }
  ,
  parse_top_filters(arr) {
    if (!arr) {
      return ''
    }

    return _.map(arr, it => {
      if (!it) {
        return null
      }
      let key = it.key;

      it.parsed_arr = _.map(it.arr, (v, ind) => {
        let sub_arr = v.split('#');
        return {
          name : sub_arr[1] || m.capitalize_first_letter(sub_arr[0]),
          key  : key,
          value: sub_arr[0]
        }

      })

      return it;

    }).filter(it => it)
  }
  ,
  from_to(n1, n2) {
    let arr = [];
    for (let i = (+n1); i <= (+n2); i++) {
      arr.push(i)
    }
    return arr;
  }
  ,
  standartize(route, key) {
    if (!route.title) {
      route.title = (m.capitalize_first_letter(key) + "'s list").replace(/s\'s/, "s'")
    }

    route.tabs = _.map(route.tabs, ParsePlainType);
    // route.edit = _.map(route.edit, ParsePlainType);
    route.top_filters = m.parse_top_filters(route.top_filters)
  }
  ,
  is_array(v) {
    return Array.isArray(v)
  }
  ,
  click(ref) {
    ref && ref.props && ref.props.onClick && ref.props.onClick()
  }
  ,
  get_component(name) {
    return name ? window.my[name] || window.ms[name] : null;
  }
  ,
  log(...args) {
    logs_hist.push(args)
    let arr = []
    last_hist = new Date().getTime()
    args.forEach((arg, i) => {
      if (typeof arg == 'object') {
        // arr.push('\n')
        try {
          arr.push('\n' + JSON.stringify(arg, null, 4) + '\n')
        } catch (e) {
          arr.push(arg)
        }
      } else {
        arr.push(arg)
      }
      // arr.push('\n')
    });

   //console.log.apply(this, arr);
  }
  ,
  getOpts(url) {
    let path = window.location.pathname;
    url = url || path.split('/')[3];
    let route = window.routes[url];
    route.__tabs = _.map(route.tabs, it => {
      return typeof it === 'string' ? {
        name: (_.map(it.split('_'), v => m.capitalize_first_letter(v))).join(' '),
        key : it
      } : it
    });

    let is_owner = /\/owner/.test(path);
    route.url = is_owner ? '/show-removed' + route.url : route.url;
    let sub_arr = path.split('/').filter(it => it && it !== 'owner');
    sub_arr.pop();
    sub_arr.pop();
    sub_arr.shift();
    route.back_url = '/' + sub_arr.join('/') + (is_owner ? '/owner' : '');

    return route
  }
  ,

  parse_eval(str, def) {
    try {
      window.eval('window.temp_tree = ' + str)
      return window.temp_tree || def;
    } catch (e) {
      return def;
    }
  }
  ,
  parse(str, def) {
    try {
      return JSON.parse(str) || def;
    } catch (e) {
      return def;
    }
  }
  ,
  perc(v1, v2) {
    let v = Math.round(100 * (v1 / (v2 || 1)));
    return v + '%'
  }
  ,
  get_url_sub(ind, is_reversed) {
    let arr = (window.location.pathname || '').split('/') || []
    return arr[is_reversed ? arr.length - 1 - ind : ind] || 'gg ';
  }
  ,
  get_item_link_from_extracter(_id) {
    return m.get_main_link() + '/' + _id + '/detailed'
  }
  ,
  get_main_link() {
    let arr = window.location.pathname.split('/')
    return '/' + arr[1] + '/' + arr[2]
  }
  ,
  get_sub_id_link(sub_id) {
    return m.get_main_link() + '/' + sub_id
  }
  ,
  go_main_list() {
    m.go(m.get_main_link())
  }
  ,

  get_id() {
    let arr = window.location.pathname.split('/')
    return arr[3]
  }
  ,
  go(url) {
    global.hist.push(url)
  }
  ,
  hide_modal() {
    window.modal && window.modal.hide && window.modal.hide()
  }
  ,
  init_app(_this) {
    window.onresize = m.set_height;
    global.hist = _this.props.history;
  }
  ,
  capitalize_first_letter(string) {
    string = string || ''
    if (!string.chartAt) {
      return ''
    }
    return (string.charAt(0) || '').toUpperCase() + string.slice(1);
  }
  ,
  get_url() {
    return window.location.pathname
  }
  ,
  time_pub(v) {
    if (!v) {
      return '-'
    }
    let date = new Date(v);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    // let ampm = hours >= 12 ? 'pm' : 'am';
    // hours = hours % 12;
    // hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    hours = hours < 10 ? '0' + hours : hours;
    let strTime = hours + ':' + minutes;
    return pub(date.getMonth() + 1) + "/" + pub(date.getDate()) + "/" + (date.getFullYear() - 2000) + ' at ' + strTime;
  }
  ,
  date_time(v) {
    if (!v) {
      return '-'
    }
    let date = new Date(v);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    // let ampm = hours >= 12 ? 'pm' : 'am';
    // hours = hours % 12;
    // hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    let strTime = hours + ':' + minutes;
    return +pub(date.getMonth() + 1) + "/" + pub(date.getDate()) + "/" + (date.getFullYear() - 2000) + ' ' +nameFn('inTime') + ' ' + strTime;
  } ,
  date_time_short(v) {
    if (!v) {
      return '-'
    }
    let date = new Date(v);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    // let ampm = hours >= 12 ? 'pm' : 'am';
    // hours = hours % 12;
    // hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    let strTime = hours + ':' + minutes;
    return +pub(date.getMonth() + 1) + "/" + pub(date.getDate()) + ' в ' + strTime;
  }
  ,
  date(v) {
    if (!v) {
      return '-'
    }
    let date = new Date(v);
    // let hours = date.getHours();
    // let minutes = date.getMinutes();
    // let ampm = hours >= 12 ? 'pm' : 'am';
    // hours = hours % 12;
    // hours = hours ? hours : 12; // the hour '0' should be '12'
    // minutes = minutes < 10 ? '0' + minutes : minutes;
    return +pub(date.getMonth() + 1) + "/" + pub(date.getDate()) + "/" + (date.getFullYear() - 2000);
  }
  ,
  prevent(e) {
    e && e.preventDefault && e.preventDefault();
    e && e.stopPropagation && e.stopPropagation();
    return false;
  }
  ,
  to_odb(cd) {
    cd = new Date(cd || new Date())

    return [ pub(cd.getFullYear()), pub(cd.getMonth() + 1),pub(cd.getDate())].join('-')

  },
  set_height() {
    let el = document.querySelector('.page-inner');
    let el2 = document.querySelector('.page-sidebar');
    // let input = document.querySelector('.page-inner input');
    el && (el.style.minHeight = Math.max(window.innerHeight, el2 ? el2.clientHeight : 0) + 'px');
    // input && input.focus && input.focus();
  }
}

global.m = m;

export default m;
