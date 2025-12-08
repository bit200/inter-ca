import React from 'react'
import './hr.css'

class Hr extends React.Component {

  render() {
    return (<div className={(this.props.small ? 'small-hr' :'')}>
      <hr/>
    </div>)
  }

}

export default Hr
