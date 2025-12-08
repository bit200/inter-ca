import React from 'react'
// import ReactExtender from './../ReactExtender/ReactExtender';
//let {ReactExtender} = window.my;

class MainWrapper extends React.Component {

  render() {
    return (<div className={'main-wrapper'}>
      {this.props.children}
    </div>)
  }

}

export default MainWrapper
