import React from 'react'
import './checkmark.css'

let $ = window.$;
// https://codepen.io/scottloway/pen/zqoLyQ - example

class Checkmark extends React.Component {
  toggle(e) {
   //console.log('........ ## toggle', this.props.status);
    // $('.circle-loader').toggleClass('load-complete');
    $('.checkmark').toggle(this.props.status);
  }

  componentWillReceiveProps(){
    this.toggle()
  }
  componentDidMount() {
    this.toggle()
  }

  render() {
   //console.log('........ ## this.state@@@@@@@@@@@@@@@@@@@@', this.props.status);
    return (
      <div className="circle-loader no-spin">
        <div className="checkmark draw"></div>
      </div>
    )
  }
}

export default Checkmark
