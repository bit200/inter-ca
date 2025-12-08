import React from 'react'
import {Link} from 'react-router-dom'


class WhiteWrapper extends React.Component {

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    window.my.m.set_height()
  }

  render() {
    let {title, back} = this.props;
    return (
      <div className="row" onClick={(e) => {
        this.props.onClick && this.props.onClick(e)
      }}>
        <div className="col-md-12">
          {title && <h3 className="mb-20">{title}</h3>}
          {back && <Link to={back}>
            <h3 className="mb-20">
              <div className="ib">
                <i className="fa fa-arrow-left fa-arrow-h3"></i></div>
              <b className="fa-go-back-button">Go Back</b></h3>
          </Link>}
          <div className="panel info-box panel-white">
            <div className="panel-body">
              {this.props.children}
            </div>
          </div>
        </div>
      </div>)
  }
}

global.WhiteWrapper = WhiteWrapper;
export default WhiteWrapper
