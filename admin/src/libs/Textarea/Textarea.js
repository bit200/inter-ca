import Textarea from 'react-textarea-autosize';
import React from 'react'
import _ from 'underscore'
// import Storage from './../Storage/Storage';

let $ = window.$;

class _Textarea extends React.Component {

  constructor(props) {
    super(props);
    this.state = {value: this.props.value}
  }

  getDeepFields() {
    let {fields, deep_fields, keys} = this.props;
    return fields || deep_fields || keys
  }

  onChange(target) {
    let {ls_key, _this} = this.props;
    let value = target.value;
    this.setState({value});
    if (ls_key) {
      // Storage.set(ls_key, value)
    }
    let fields = this.getDeepFields();

    if (_this && fields) {
      _this.deepUpdate(fields, value, null, () => {
        this.props.onChange && this.props.onChange(value, this.props._key)
      })
    } else {

      this.props.onChange && this.props.onChange(value, this.props._key)

    }

  }



  get() {
    return this.state.value;
  }

  render() {
    let {label, woLabel, autoFocus, defClass, _this, links = [], leng, placeholder, max_leng = 99999, min_leng = 0, maxRows, title = '', _key, value, ls_key, minRows} = _.extend({}, this.props, this.props._opts);

    let fields = this.getDeepFields();

    if (this && fields) {
      value = _this.getDeep(fields)
    }
    if (ls_key && !this.already_inited) {
      this.already_inited = true
      // value = Storage.get(ls_key)
    }
    value = value || ''
    let name = title || label || placeholder

    return (
      <div>
        {!!links && !!links.length && <small className="links">
          {(links || []).map((item, ind) => {
            return (<a className='link_item' key={ind} href={item.href || item.url || item} >
              {item.name || 'Link' + ind + ' '}
            </a>)
          })}
        </small>}
        {name && !woLabel && <small>{name}</small>}{leng && <small>: {(value || '').length}</small>}
        <Textarea
            autoFocus={autoFocus}
          ref={(c) => {
            this.el = c
          }}
          onFocus={() => {
            this.props.onFocus && this.props.onFocus()
          }}
          onClick={(e) => {
            this.props.onClick && this.props.onClick()
          }}
          onMouseDown={(e) => {
            this.props.onMouseDown && this.props.onMouseDown(e)
          }}
          onMouseUp={(e) => {
            this.props.onMouseUp && this.props.onMouseUp()
          }}
          onBlur={() => {
            this.props.onBlur && this.props.onBlur()
          }}
          onKeyDown={(e) => {
            let {code, key, metaKey, shiftKey, ctrlKey} = e;
            this.props.onKeyDown && this.props.onKeyDown(e)
            if (key === 'Enter' && !(metaKey || shiftKey || ctrlKey)) {
              return this.props.onEnter && this.props.onEnter(e)
            }
          }}
            disabled={this.props.disabled}
          placeholder={name} minRows={minRows || 2} maxRows={maxRows || 20}
          className={"form-control" + (defClass ? ` ${defClass}` : ``)}
          onChange={(e) => this.onChange(e.target)} value={value}></Textarea>

      </div>
    )
  }
}

// global.Textarea = _Textarea;

export default _Textarea

