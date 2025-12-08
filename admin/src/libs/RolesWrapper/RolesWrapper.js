import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import user from './../user/user';
//let {ReactExtender} = window.my;

class RolesWrapper extends ReactExtender {
  
  render() {
    let is_roles = user.is_roles(this.props.roles)
    return (is_roles ? <div className={'ub'}>
      {this.props.children}
    </div> : null)
  }

}

export default RolesWrapper
