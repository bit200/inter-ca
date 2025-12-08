import React from 'react'
import {Link, withRouter} from 'react-router-dom'
import Modal from 'react-modal'
import CloseButton from './../CloseButton/CloseButton'
import Button from './../Button/Button'
import Checkmark from './../Checkmark/Checkmark'
import Notify from '../Notify/Notify'
import http from './../http/http'
import m from './../m/m'

class ConfirmModal extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false
    };
  }

  componentWillReceiveProps(a) {
    if ('isOpen' in a) {
      this.setState({isOpen: a.isOpen})
    }
  }

  onSuccess(scb, ecb) {
    let {opts = {}, item, onSuccess, router} = this.props;
    if (this.props.cb ) {
      this.props.cb()
      return
    }
    if (opts.url && item && item._id) {
      if (item.is_removed) {
        http.post(opts.url + '/restore', {_id: item._id})
          .then(r => {
           //console.log('........ ## rrrr', r);
            scb && scb();
            Notify.success('Successfully Restored.');
            this.setState({confirmed: true})
            setTimeout(() => {
              this.successTimer()
            }, 1500)
          })
          .catch(e => {
           //console.log('........ ## eeee', e);
            ecb && ecb()
          })
      } else {
        http.delete(opts.url, {_id: item._id})
          .then(r => {
           //console.log('........ ## rrrr', r);
            scb && scb();
            Notify.success('Successfully Removed.');
            this.setState({confirmed: true})
            setTimeout(() => {
              this.successTimer()
            }, 1500)
          })
          .catch(e => {
           //console.log('........ ## eeee', e);
            ecb && ecb()
          })
      }

    } else {
      onSuccess && onSuccess(scb, ecb)
    }
  }

  successTimer() {
    let {onSuccess} = this.props;
    this.setState({confirmed: false})
    this.hide()
    window.modal && window.modal.hide && window.modal.hide()
    onSuccess && onSuccess();
    m.go_main_list()
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
    this.setState({isOpen: false})
  }

  render() {
    let {item = {}} = this.props;
    let is_removed = item.is_removed;
    let {link, title = is_removed ? 'Are you sure to restore?' : 'Are you sure to remove?'} = this.props;
    let {isOpen, confirmed} = this.state;
    window.confirm_modal = this;
    window.props = this.props;

    return (<Modal
      isOpen={isOpen}
      onRequestClose={() => {
       //console.log('*........ ## on request closeeeeeeeeeee');
        this.onClose()
        this.props.onClose && this.props.onClose();

      }}
      className={'modal-size-small'}
    >
      {!confirmed && <div className="modalContent">

        <i className="fa fa-times pull-right" onClick={() => {
          this.onClose()
        }}/>
        <div className="text-center">
          <h4>{title}</h4>
          <div className="text-center mt-20">
            <div className="ib">
              <CloseButton modal={'confirm_modal'} onClick={() => {
                this.onClose()
              }}></CloseButton>
            </div>
            <div className="ib">
              <Button onClick={(scb, ecb) => {
                this.onSuccess(scb, ecb)
              }}>Yes</Button>
            </div>


          </div>
        </div>
      </div>}
      {confirmed && <div className={"text-center"}>
        <h3 className={"mb-10"} >{is_removed ? 'Restored' : 'Removed'} Successfully!</h3>
        <Checkmark status={confirmed}></Checkmark>

      </div>}
    </Modal>)
  }

}

global.ConfirmModal = ConfirmModal;
export default ConfirmModal
