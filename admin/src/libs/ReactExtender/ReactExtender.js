import React from 'react'
import http from './../http/http';
import m from './../m/m';
import Storage from './../Storage/Storage';

let _ = window._;

class ReactExtender extends React.Component {

  constructor(props) {
    super(props);
    this.state = {item: this.props.item};
    this.ls_keys = {}
  }

  componentWillReceiveProps(a) {
    this.setState({item: a.item})
  }

  get_one(params) {
    // console.log('*........ ## http  get one');
    try {
      this.setState({api_loading: true})
    } catch (e) {
    }
    http.get(this.api_url + '/' + m.get_id())
      .then(item => {
        let pre_get = (this.opts || {}).pre_get || this.pre_get;
        this.setState({api_loading: false, item: pre_get ? pre_get(item) : item, api_url: this.api_url})
      })
      .catch(e => {
        this.setState({api_loading: false})
      })
  }

  get(params) {
  // console.log('*........ ## http get');

    try {
      this.setState({api_loading: true})
    } catch (e) {
    }
    http.get(this.api_url)
      .then(data => {
        let items = data.items || data;

        let pre_get = (this.opts || {}).pre_get || this.pre_get;

        items = _.map(items, item => {
          return pre_get ? pre_get(item) : item
        });
        this.setState({
          api_loading: false,
          _item      : items[0],
          items      : items,
        })
        this.api_cb('get', items)
      })
      .catch(e => {
        this.setState({api_loading: false})
      })
  }

  create(data, cb) {
    try {
      this.setState({api_create_loading: true})
    } catch (e) {
    }
    http.post(this.api_url, data)
      .then(data => {
        this.setState({
          api_create_loading: false
        })
        cb && cb(data)
        this.api_cb('create', data)
      })
      .catch(e => {
        this.setState({api_create_loading: false})
      })
  }

  _delete(data, cb) {
    try {
      this.setState({api_delete_loading: true})
    } catch (e) {
    }
    http.delete(this.api_url, {_id: data._id})
      .then(data => {
        this.setState({
          api_delete_loading: false
        })
        cb && cb(data)
        this.api_cb('delete', data)
      })
      .catch(e => {
        this.setState({api_delete_loading: false})
      })
  }

  update(data, cb) {
  // console.log('*........ ## http update');
    try {
      this.setState({api_create_loading: true})
    } catch (e) {
    }
    http.put(this.api_url, data)
      .then(data => {
        this.setState({
          api_create_loading: false
        })
        cb && cb(data)
        this.api_cb('update', data)
      })
      .catch(e => {
        this.setState({api_create_loading: false})
      })
  }

  api_cb() {

  }

  get_ls(arr) {
    let obj = {}
    _.each(arr, (key, ind) => {
      obj[key] = Storage.get(key)
      this.ls_keys[key] = true;
    })
  // console.log('........ ## objbjbjbjbjbjbjbjb', obj);
    // try {
    //   this.setState({obj})
    // } catch(e) {}
    return obj;
  }

  update_ls(arr) {
    _.each(arr, (key) => {
      Storage.set(key, this.state[key])
    })
  }

  update_ls_all(arr) {
    _.each(this.ls_keys, (value, key) => {
      Storage.set(key, this.state[key])
    })
  }


  api_get(params) {
  // console.log('*........ ## http api get');
    try {
      this.setState({api_loading: true})
    } catch (e) {
    }
    http.get(this.api_url, params)
      .then(r => {

      // console.log('*........ ## hhhhhhhh');
      // console.log('*........ ## hhhhhhhh');
      // console.log('*........ ## hhhhhhhh');
      // console.log('*........ ## hhhhhhhh');
      // console.log('*........ ## hhhhhhhh');
      // console.log('*........ ## hhhhhhhh');
        let pre_get = (this.opts || {}).pre_get || this.pre_get;


        if (m.is_array(r)) {
          let items = _.map(r, item => {
            return pre_get ? pre_get(item) : item
          });

          this.setState({api_loading: false, items: r})
        } else {
          this.setState({api_loading: false, item: pre_get ? pre_get(r) : r})
        }
      })
      .catch(e => {
        this.setState({api_loading: false})
      })
  }

  api_get_create(params) {
  // console.log('*........ ## api get create');
    try {
      this.setState({api_loading: true})
    } catch (e) {
    }
    http.get(this.api_url + '/find_create', params)
      .then(r => {
        this.setState({api_loading: false, item: r})
      })
      .catch(e => {
        this.setState({api_loading: false})
      })
  }


  api_update(opts) {
  // console.log('*........ ## update');
    let {scb, ecb, item} = opts || {}
    this.setState({api_updating: true})
    item = item || this.state.item;
    item = this.pre_update ? this.pre_update(item) : item;

    http.put(this.api_url, {item})
      .then(r => {
        this.setState({api_updating: false})
      })
      .catch(e => {
        this.setState({api_updating: false})
      })
  }

  emitToParent() {
    this.props.emitToParent && this.props.emitToParent.bind(this)
  }

  getDeep(keys_arr, def) {
    let it = this.state;
    let leng = keys_arr.length;
    _.each(keys_arr, (key, index) => {
      it = it ? it[key] : index === leng - 1 ? null : null;
    });

    return it || it == 0 ? it : def;
  }

  setDeep(keys_arr, value, cb) {
    let item = this.state;
    let it = item;
    let leng = keys_arr.length;
    _.each(keys_arr, (key, index) => {
      if (index === leng - 1) {
        it[key] = value
      } else {
        it[key] = it[key] || {}
      }
      it = it[key];
    });

    let first_key = keys_arr[0];
    let second_key = keys_arr[1];

    let obj = {};

    obj[first_key] = item[first_key];
    this.setState(obj, cb);
    try {
      (first_key === 'item') && this.props.onChange && this.props.onChange(item[first_key][second_key], second_key);
    } catch (e) {
    }

    return item;
  }

  deepUpdate(keys_arr, value, signal, cb) {
    let key = keys_arr[keys_arr.length - 1];
    keys_arr.pop();


    let it = this.getDeep(keys_arr) || {};

    if (signal === 'push') {
      console.warn('*........ ## key', keys_arr, key);
      it[key] = it[key] || [];
      it[key].push(value)
    } else if (signal === 'unshift') {
      it[key] = it[key] || [];
      it[key].unshift(value)
    } else if ((signal === 'pop') || (signal === 'delete')) {
      it[key].splice(value, 1);
      this.onPop && this.onPop(keys_arr.concat(key), value)
    } else {
      it[key] = value;
    }

    if (keys_arr.length) {
      let v = this.setDeep(keys_arr, it, cb)
    } else {
      let v = this.setDeep([key], it[key], cb)
    }
  }

  updateDeep(keys_arr, key, value, signal) {
    this.deepUpdate(keys_arr, key, value, signal)
  }


  deepItemUpdate(keys_arr, key, value, signal) {
    let {item} = this.state;
    let it = item;
    _.each(keys_arr, (key, index) => {
      it = it[key];
    });

    if (signal === 'push') {
      it[key] = it[key] || []
      it[key].push(value)
    } else if (signal === 'delete') {
      it[key].splice(value, 1);
    } else {
      it[key] = value;
    }


    let first_key = keys_arr[0];

    this.setState({item});
    this.props.onChange && this.props.onChange(item[first_key], first_key)

  }

  onAdd(field) {
    let {item} = this.state;
    item[field].unshift({});
    this.onChange(item[field], field)
  }

  onRemove(field, index) {
    let {item} = this.state;
    item[field].splice(index, 1);
    this.onChange(item[field], field)
  }

  changeOrder(delta) {
    this.props.changeOrder()
  }


  _onChange(value, key, key2) {
    this.props.onChange && this.props.onChange(value, key, key2)
  }

  onChange(value, key, arrayIndex = -1) {
  // console.log('*........ ## on changeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', value, key);
    let {item} = this.state || {};
    try {

      if (!key) {
        item = value;
        this.setState({item})

      } else if (item && arrayIndex >= 0) {
        item[key] = item[key] || []
        item[key][arrayIndex] = item[key][arrayIndex] || ''
        item[key][arrayIndex] = value;
        this.setState({item})
      } else if (item) {
        let arr = key.split('.');
        let vv = item;
        _.each(arr, (it, ind) => {
          if (ind === arr.length - 1) {
            vv[it] = value;
          } else {
            vv[it] = vv[it] || {}
            vv = vv[it]
          }
        });

        // item
        this.setState({item}, console.log)

      }
    } catch (e) {

    }

    this.props && this.props.onChange && this.props.onChange(value, key, arrayIndex)
  }

  render() {
    return (<div></div>)
  }

}
global.ReactExtender = ReactExtender;
global.getDeep = (_this, keys, def) => {
  let it = _this.state;
  let leng = keys.length;
  _.each(keys, (key, index) => {
    it = it ? it[key] : index === leng - 1 ? null : null;
  });

  return it || def;
};

global.setDeep = (_this, keys, value) => {
  let item = _this.state;
  let it = item;
  let leng = keys.length;
  _.each(keys, (key, index) => {
    if (index === leng - 1) {
      it[key] = value
    } else {
      it[key] = it[key] || {}
    }
    it = it[key];
  });

  let first_key = keys[0];
  let second_key = keys[1];

  let obj = {};

  obj[first_key] = item[first_key];
  _this.setState(obj);
  try {
    (first_key === 'item') && _this.props.onChange && _this.props.onChange(item[first_key][second_key], second_key);
  } catch (e) {
  }

  return item;
}
export default ReactExtender
