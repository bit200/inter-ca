import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
//let {ReactExtender} = window.my;

class DeleteButton extends ReactExtender {

  render() {
    return (<div className="pull-right absolute-delete" style={{zIndex: 10, opacity: this.props.opacity || 1}} onClick={(e) => this.props.onClick && this.props.onClick(e)}>
       <i className="iconoir-xmark"></i>
    </div>)
  }

}

global.DeleteButton = DeleteButton;

export default DeleteButton
