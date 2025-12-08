import React from 'react'
import ReactDOM from 'react-dom'
import Avatar from '@components/Avatar'
import Modal from 'react-modal'
import MyModal from '../MyModal/MyModal';
import ReactExtender from './../ReactExtender/ReactExtender';
import MainWrapper from './../WhiteWrapper/WhiteWrapper';
import WhiteWrapper from './../WhiteWrapper/WhiteWrapper';
import AvatarPreview from './../AvatarPreview/AvatarPreview';
import FieldsWrapper from './../FieldsWrapper/FieldsWrapper';
import ParsePlainType from './../ParsePlainType/ParsePlainType';
import Input from './../Input/Input';
import Button from './../Button/Button';
import Loading from './../Loading/Loading';
import Hr from './../Hr/Hr';
import http from './../http/http';
import user from './../user/user';
import './profile.css'

let _ = window._;

class MyAvatar extends React.Component {

  constructor(props) {
    super(props)
    const src = ''
    this.state = {
      preview: null,
      src
    }
    this.onCrop = this.onCrop.bind(this)
    this.onClose = this.onClose.bind(this)
  }

  onClose() {
    this.setState({preview: null})
  }

  onCrop(preview) {
    this.setState({preview})
  }

  render() {
    return (
      <div className={"row"}>
        <div className="col-xs-12">
          <Avatar
            width={390}
            height={295}
            onCrop={this.onCrop}
            onClose={this.onClose}
            src={this.state.src}
          />
        </div>
        {/*<div className="col-xs-5">*/}
        {/*{this.state.preview && <img src={this.state.preview} alt="Preview"/>}*/}
        {/*</div>*/}

        <div className="col-xs-12 text-right">
          <Hr/>
          <Button
            disabled={false}
            onClick={() => {
              let {preview} = this.state;
              this.props.onChange && this.props.onChange(preview)
            }}
          >Upload</Button>

        </div>

      </div>
    )
  }
}

class Profile extends ReactExtender {

  constructor(props) {
    super(props);
    this.state = {loading: true, item: {}, pass_item: {}};
  }

  componentDidMount() {
    this.loadDetails()
  }

  loadDetails() {
    // user.get_info()
    this.setState({loading: false, item: user.get_info()})
  }

  render() {
    let {
      fields = [
        'first_name',
        'last_name',
        'email',
        'username'
      ]
    } = this.props;
    let {item, loading, pass_item, isOpen} = this.state;

    return (<div className={"afade"}>
        <div className="profile-cover ">
          <div className="row">
            <div className="col-md-3 profile-image">
              <div className="profile-image-container" onClick={() => {
                this.modal && this.modal.show()
                this.setState({isOpen: true})
              }}>
                <AvatarPreview
                  src={this.state.img}
                >
                </AvatarPreview>
              </div>
            </div>
            <div className="col-md-12 profile-info">
              <div className="profile-info-value"><h3>-</h3><p>Feedbacks</p></div>
              <div className="profile-info-value"><h3>-</h3><p>Tech Level</p></div>
            </div>
          </div>
        </div>
        <div className="main-wrapper2 text-center2">
          <div className="profile-wrapper">
            <WhiteWrapper>
              <Loading value={loading}>
                <FieldsWrapper
                  tt={333}
                  item={item}
                  deep_fields={['item']}
                  fields={fields}
                ></FieldsWrapper>
                <div className="col-xs-12">
                  <Hr/>
                </div>

                <div className="col-xs-12 text-right">
                  <Button
                    className={"ib mr-5 pull-left"}
                    disabled={false}
                    onClick={(scb, ecb) => {
                      this.pass_modal && this.pass_modal.show()
                    }}
                  >Password Reset</Button>
                  <Button
                    className={"ib"}
                    onClick={(scb, ecb) => {
                      // console.log('........ ## item', this.state.item);
                      user.on_update(this.state.item, scb, ecb)
                    }}
                  >Update</Button>

                </div>
              </Loading>
              <MyModal
                ref={(el) => this.modal = el}
              >
                <MyAvatar
                  onChange={(preview) => {
                    // console.log('........ ## preview', preview);
                    this.setState({img: preview})
                    http.post('/users/upload_profile', {base64: preview})
                      .then(r => {
                        // console.log('........ ## done');
                        this.modal && this.modal.hide()
                        window.Header.rerender()
                      })
                      .catch(e => {
                      // console.log('........ ## ee');
                      })
                  }}
                ></MyAvatar>
              </MyModal>
              <MyModal
                ref={(el) => this.pass_modal = el}
              >
                <Input type={"password"} placeholder={"Old Password"}
                       _this={this} fields={['pass_item', 'old_password']}/>
                <Input type={"password"} placeholder={"New Password"}
                       _this={this} fields={['pass_item', 'new_password']}/>
                <Input type={"password"} placeholder={"Confirm New Password"}
                       _this={this} fields={['pass_item', 'new_password2']}/>
                <Hr/>
                <Button onClick={(scb, ecb) => {
                  user.password_update(pass_item, () => {
                    this.pass_modal.hide()
                    scb && scb()
                  }, ecb)
                }}>
                  Update Password
                </Button>
              </MyModal>

            </WhiteWrapper>
          </div>
        </div>
      </div>
    )
  }
}

export default Profile
