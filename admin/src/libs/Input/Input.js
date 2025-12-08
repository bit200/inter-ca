import React from 'react'
import m from './../m/m';
import Storage from './../Storage/Storage';
import Textarea from "react-textarea-autosize";

let $ = window.$;

class Input extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }
  getDeepFields() {
    let {fields, deep_fields, keys} = this.props;
    return fields || deep_fields || keys
  }

  onChange(value, key) {
    let {_this, ls_key} = this.props;
    let fields = this.getDeepFields()


    if (_this && fields) {
      _this.deepUpdate(fields, value, null, () => {
        this.props.onChange && this.props.onChange(value, key)
      })

    } else {
      this.props.onChange && this.props.onChange(value, key)
    }


    if (ls_key) {
      Storage.set(ls_key, value)
    }
  }

  componentDidMount() {
    if (this.props.autofocus) {
      this.el.focus()
    }
    if (this.props.autoselect) {
      $(this.el).focus().select()
    }
    // this.refs.inp.value = this.props.start_value || '';
    this.adjustSize()
  }

  componentWillReceiveProps() {
    this.adjustSize()
  }

  adjustSize() {
    if (!this.props.autosize) {
      return;
    }
    let $el = this.refs.inp
    let value = $el.value;
    let width = getWidthOfInput();
    $el.style.width = width + 'px';

    function getWidthOfInput() {
      var tmp = document.createElement("span");
      tmp.className = "input-element tmp-element";
      tmp.innerHTML = $el.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      document.body.appendChild(tmp);
      var theWidth = tmp.getBoundingClientRect().width + 15;
      document.body.removeChild(tmp);
      return theWidth;
    }
  }

  render() {
    let {
      ls_key, _this, links = [], start_value, mainClass, title, _key, ib, placeholder,
      value, woLabel, size, type
    } = this.props;
    let fields = this.getDeepFields()

    if (_this && fields) {
      value = _this.getDeep(fields)
    }
    if (ls_key && !this.already_inited) {
      this.already_inited = true
      value = Storage.get(ls_key)
    }
    let key = _key;
    let _title = title || this.props.label || m.capitalize_first_letter(key) || placeholder
    var label = {
      verticalAlign: 'top',
      marginTop    : '14px'
    };
    let pp = {};
    if (this.props.id) {
      pp.id = this.props.id;
    }
    if (this.props.preventAutocomplete) {
      pp.autocomplete = 'off'
      pp.name = 'autocomplete_' + new Date().getTime();
    }
    return (
        <div className={(size ? ('col-xs-' + size) : ib ? 'ib w100' : (mainClass || ''))}>
          {!woLabel && type !== 'checkbox' && <small>{nameFn(_title)}</small>}

          {(type === 'checkbox') && !woLabel && <label>
            <div>
              <small className="ib " style={label}>{nameFn(_title)}</small>
            </div>
            <input className={'form-control ib ' + this.props.defClass} type={'checkbox'}

                                                ref={(el) => this.el = el}

                                                onChange={(e) => {
                                                  this.onChange(e.target.checked, key)

                                                  setTimeout(() => {
                                                   this.setState({cd: new Date().getTime()})
                                                  }, 10)
                                                }}
                                                checked={value}
                                                value={value || ''}
          />
          </label>}
          {!!links && !!links.length && <small className="links">
            {(links || []).map((item, ind) => {
              return (<a className='link_item' key={ind} href={item.href || item.url || item} >
                {item.name || 'Link' + ind + ' '}
              </a>)
            })}
          </small>}
          {type !== 'checkbox' && <input
              {...pp}
              key={this.props.key || ''}
              className={'form-control ' + (this.props.class || this.props.className || '')} type={type || 'text'}
              ref={(el) => this.el = el}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  this.props.onEnter && this.props.onEnter()
                  m.click(this.props.onEnterClick)
                }
                if (e.key === 'Escape') {
                  this.props.onEsc && this.props.onEsc()
                  m.click(this.props.onEscClick)
                }
                this.adjustSize()
                this.props.onKeyDown && this.props.onKeyDown(e)

              }}
              onClick={() => {
                this.props.onClick && this.props.onClick()
              }}
              onFocus={() => {
                this.props.onFocus && this.props.onFocus()
              }}
              onBlur={() => {
                this.props.onBlur && this.props.onBlur(value || '')
              }}
              onChange={(e) => this.onChange(e.target.value, key)}
              placeholder={t(placeholder || title || key)} value={value || ''}
          />}
        </div>
    )
  }
}

export default Input
