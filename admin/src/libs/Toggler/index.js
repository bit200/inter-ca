import React from 'react';
import _ from 'underscore';
import './index.css'

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.id = 'swtich' + window.m.get_id();
  }

  onChange(value) {
    // load.set(this.props.item, value);
    this.props.onChange && this.props.onChange(value);
  // console.log('*........ ## on thamve', this.props, value);
    this.setState({cd: new Date()})
  }

  render() {
    let item = this.props.item || {};
    let width = this.props.width || 14;
    let value = this.props.item ? item.value : this.props.value;

    return (<div className={"ib vtop " + this.props.className} style={{marginRight: (this.props.right || 0) + 'px'}} onClick={(e) => {
      e.stopPropagation();
      return true;
    }} >

            <div className="form-check">
              <label className="form-check-label form-check-toggle">
                <input className="form-check-input" checked={!!value}  type="checkbox" onChange={(e) => {
                  this.onChange(!value);
                }}/><span></span>
              </label>
            </div>

      {/*<div className="form-check form-switch">*/}
      {/*  <input className="form-check-input" checked={!!value} type="checkbox" id={this.id} onChange={(e) => {*/}
      {/*    this.onChange(!value);*/}
      {/*  }}/>*/}
      {/*  <label className="form-check-label" htmlFor={this.id} >{this.props.title || this.props.label || ''}</label>*/}
      {/*</div>*/}

    </div>)
  }

}

// window.Toggler = Item;

export default Item;
