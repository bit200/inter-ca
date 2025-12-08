import React from 'react'
import './spinner.css'

class Spinner extends React.Component {

  render() {
    return <div className={`w100 text-center spinner ${this.props.isOverlay && 'overlay-loader'}`}>
      <i className="fa fa-spinner fa-spin spin-20"></i>
    </div>
  }

}

global.Spinner = Spinner;


export default Spinner
