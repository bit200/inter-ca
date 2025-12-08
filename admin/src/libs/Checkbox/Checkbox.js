import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';

//let {ReactExtender} = window.my;
let $ = window.$;

class Checkbox extends ReactExtender {

  onChange(value, key) {
    let {deep_fields, _this, onChange} = this.props;
    if (deep_fields) {
      _this.deepUpdate(deep_fields, value)
    }
    onChange && onChange(value, key)
  }
  render() {
    let {title, _this, _key, className, value, wolabel, size, type, deep_fields} = this.props;
    if (deep_fields) {
      value = _this.getDeep(deep_fields)
    }
    let key = _key;
    return (
      <div className={((size ? ('col-xs-' + size) : 'ib') + ' ' + (className || ''))}>
        <label className={'mw-15'}>
          {value ? <input className={'form-control '} type={'checkbox'}
                          onChange={(e) => {
                            this.onChange(false, key)
                          }}
                          checked
          /> : <input className={'form-control '} type={'checkbox'}
                      onChange={(e) => this.onChange(true, key)}
          />}
          {!wolabel && <small><b>{title || key}</b></small>}
        </label>
      </div>
    )
  }

}
global.Checkbox = Checkbox;

export default Checkbox
