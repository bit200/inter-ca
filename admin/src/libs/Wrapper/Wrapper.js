import React from 'react'
import {Link} from 'react-router-dom'
import WhiteWrapper from '../WhiteWrapper/WhiteWrapper'
import Button from '../Button/Button'

class Wrapper extends React.Component {

  render() {
    let {title, title2, back, woMainWrapper, woTitle, size} = this.props;
    let str = '/' + window.location.pathname.split('/').splice(2, 5).filter(it => it !== 'owner').join('/');
    return <div className={'wrapper-size-' + (size || 'full')}>
      {title && !woTitle && <div className="page-title">
        <h3>{title}
        </h3>
      </div>}
      {!woMainWrapper && <div className="main-wrapper">
        {this.props.children && <WhiteWrapper title={title2} back={back}>
          {this.props.children}
        </WhiteWrapper>}
      </div>}
      {woMainWrapper && this.props.children && <WhiteWrapper title={title2} back={back}>
          {this.props.children}
        </WhiteWrapper>}
    </div>
  }
}

export default Wrapper
