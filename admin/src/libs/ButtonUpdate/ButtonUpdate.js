import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import Button from './../Button/Button';

class ButtonUpdate extends ReactExtender {
  
  render() {
    let {_this} = this.props;
    let {api_updating} = _this.state;
    return (<Button
      className={this.props.className || 'pull-right'}
      disabled={api_updating}
      onClick={(scb, ecb) => _this.api_update({scb, ecb})}>
      {this.props.children || 'Update'}
    </Button>)
  }

}

export default ButtonUpdate
