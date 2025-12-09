import React from 'react'
import {Link, withRouter} from 'react-router-dom'
import './myModal.css'
import Modal from 'react-modal'
import Button from '../Button/Button'

class MyModal extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: this.props.isOpen
    };
  }

  componentWillReceiveProps(a) {
    // console.log('........ ## aaaa', a);
    if ('isOpen' in a) {
      this.setState({isOpen: a.isOpen})
    }
  }

  show() {
    this.onOpen()
  }

  hide() {
    this.onClose()
  }

  onOpen() {
    this.setState({isOpen: true})
  }

  onClose() {
    // console.log('*........ ## on closeeeeeeeeee');
    this.setState({isOpen: false})
    this.props.onClose && this.props.onClose()

  }

  render() {
    let {woCard, item = {}, link, title} = this.props;
    let {isOpen} = this.state;
    window.modal = this;
    return (<Modal
      ariaHideApp={false}
      isOpen={!!isOpen}
      onRequestClose={() => {
       //console.log('*........ ## request closeeeeeeeeeeeeeeeee');
        this.onClose()
      }}
      className={'modal-size-' + (this.props.size || 1) + ' ' + (this.props.defClass || '')}
      contentLabel="Transactions Details"
    >
      <div className={!woCard ? "card" : ''} style={{marginBottom: '0px'}}>
        <div className={!woCard ? "card-body" : ''}>
          <div className=" afade mmodal">
            {!this.props.woClose && <i className="iconoir-xmark pull-right pointer" onClick={() => {
              this.onClose()
            }}/>}
            {link && <Link to={link.replace(/undefined/gi, global.location.href.split('/')[4])} className="mt--20"
                           onClick={() => this.hide()}>#{title}</Link>}
            {title && !link && <h3 className="mt-0">{title}</h3>}
            {(link || title) && <hr/>}
            {this.props.children}
          </div>
        </div>
      </div>

    </Modal>)
  }

}

global.MyModal = MyModal;

export default MyModal
