import React from 'react'

class Button extends React.Component {
  onClose(e) {
    let {modal = 'modal'} = this.props;
    window[modal] && window[modal].hide()
    // var esc = window.$.Event("keydown", { keyCode: 27 });
    // window.$("body").trigger(esc);

  }

  render() {
    return (
      <button disabled={false} type="button" className="btn btn-default  hide-without-modal" onClick={() => {
        this.onClose()
      }}>
        Cancel
      </button>
    )
  }
}

global.CloseButton = Button;

export default Button
