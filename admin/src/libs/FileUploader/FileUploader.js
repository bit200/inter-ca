import React from 'react'
import axios from 'axios'
let img_domain = global.env.domain;

class FileUploader extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      uploadStatus: false
    }
    this._handleUploadImage = this.handleUploadImage.bind(this);
  }


  handleUploadImage(ev) {
    // console.log('*........ ## send data', this.uploadInput);

    ev && ev.preventDefault && ev.preventDefault();
    const data = new FormData();
    let file = this.uploadInput.files[0]
    data.append('file', file);
    data.append('filename', this.props.filename || file.name);
    data.append('folder', this.props.folder || '');
    data.append('path', this.props.path || '');
    // global.http.post('/upload', data)
    axios.post(global.env.domain + '/api/upload', data)
      .then( (response) => {
        this.props.onChange && this.props.onChange(response ? response.data : response)
        // this.setState({imageURL: `http://localhost:8000/${response.file}`, uploadStatus: true});
      })
      .catch(function (error) {
        // console.log(error);
      });

  }

  // function drag(ev) {
  //   ev.dataTransfer.setData("text", "foo");
  // }
  //
  // function allowDrop(ev) {
  //   $(ev.target).attr("drop-active", true);
  //   ev.preventDefault();
  // }
  //
  // function leaveDropZone(ev) {
  //   $(ev.target).removeAttr("drop-active");
  // }
  //
  // function drop(ev) {
  //   ev.preventDefault();
  //   $(ev.target).removeAttr("drop-active");
  //   alert(ev.dataTransfer.getData("text"));
  // }


  render() {
    let {label, full, url} = this.props || {}
    let _this = this;
    return (
      <div className="container2">
        {label && <small>{label}</small>}
        {label && <b className={'pull-right'} onClick={() => {
          this.props.onChange && this.props.onChange({url: ''})
        }}>x</b>}
        <form onSubmit={this.handleUploadImage} >
          <div className="form-group">
            <input className="form-control inpf"
                   style={{background: 'url(' + img_domain + url + ')'}}

                   ref={(ref) => {
                     this.uploadInput = ref;
                   }} type="file" onChange={() => {
              if (!full) {
                setTimeout(() => {
                  _this.handleUploadImage()
                })
              }
            }}/>
          </div>

          {full && <div className="form-group">
            <input className="form-control" ref={(ref) => {
              this.fileName = ref;
            }} type="text" placeholder="Optional name for the file"/>
          </div>}


          {/*<button className="btn btn-success" type onPress={(e) => {*/}
          {/*  this.handleUploadImage(e)*/}
          {/*}}>Upload</button>*/}

        </form>
      </div>
    )
  }

}

global.FileUploader = FileUploader;

export default FileUploader
