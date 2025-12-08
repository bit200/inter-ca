import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
//let {ReactExtender} = window.my;

class Boolean extends ReactExtender {

  render() {
    let {value} = this.props;
    return (<div className={'ib'}>
      {value ? '+' : '-'}
    </div>)
  }

}

export default Boolean
