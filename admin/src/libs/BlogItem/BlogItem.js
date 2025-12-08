import React from 'react'
import Checkbox from "./../Checkbox/Checkbox";
import Textarea from "./../Textarea/Textarea";
import FileUploader from "./../FileUploader/FileUploader";

let {ReactExtender, m, Select, Hr, Input, Checkboxes} = global;


class BlogItem extends ReactExtender {
  //
  // constructor(props) {
  //   super(props)
  //   this.deep_fields = this.props.deep_fields;
  // }
  _onChange(value, key, key2) {
    let keys = this.props.deep_fields.concat(key)
    // console.log('*........ ## fhhhhhhhhhhhhhhh', key, keys, value, this.props);
    global.setDeep(this.props._this, keys, value)
    // this.props.onChange && this.props.onChange(value, key, key2)
  }

  render() {
    let domain = 'http://localhost:4041'
    // let domain = 'http://18.185.96.227:4041'
    let {deep_fields, _this} = this.props;
    let item = global.getDeep(_this, deep_fields, {text: ''});


    if (item) {
      item._type = item._type || 'Text'
    }
    // let item = m.get_deep
    let {_type, status, daily_status} = item;

   // console.log'*........ ## ffff', this.props);
    return (<div className={'row blog-item'}>


      <div className="col-sm-6">

        <Select
          value={_type}
          title={"Type"}
          items={['Text', 'Img', 'Video', 'Header', 'Header2']}
          onChange={(value) => {
           // console.log'........ ## ON CAHGNE CATEGORY', value);
            this._onChange(value, '_type')
          }}
        >
        </Select>

        <Input value={item.title} title={'Title'}
               onChange={(value) => {
                 this._onChange(value, 'title')
               }}></Input>
        {item._type === 'Text' && <Textarea value={item.text} title={'Text'} onChange={(value) => {
          this._onChange(value, 'text')
        }}></Textarea>}
        {item._type === 'Header' && <Textarea value={item.text} title={'Text'} onChange={(value) => {
          this._onChange(value, 'text')
        }}></Textarea>}
        {item._type === 'Header2' && <Textarea value={item.text} title={'Text'} onChange={(value) => {
          this._onChange(value, 'text')
        }}></Textarea>}

        {item._type === 'Img' &&
        <div><Input value={item.value} title={'Img Url (will be automatically pulled after load)'}
                    onChange={(value) => {
                      this._onChange(value, 'value')
                    }}></Input>
          <Input value={item.value2} title={'Image Description (Short for SEO)'}
                 onChange={(value2) => {
                   this._onChange(value2, 'value2')
                 }}></Input>
          <Input value={item.max_width} title={'Image Max width'}
                 onChange={(value2) => {
                   this._onChange(value2, 'max_width')
                 }}></Input>
          <Hr/>
          <FileUploader folder={window.t.state.item._id} onChange={(r) => {
            this._onChange(r.url, 'value')
          }} short={true}></FileUploader>

        </div>}
 {item._type === 'Video' &&
        <div><Input value={item.value} title={'Img Video URL'}
                    onChange={(value) => {
                      this._onChange(value, 'value')
                    }}></Input>

        </div>}

      </div>
      <div className="col-sm-6">
        <small>Paragraph Preview</small>
        {item.title && <h3>{item.title}</h3>}
        <div className={"mt-10"}>
          {_type === 'Text' && <div className={"whtie_space_pre"} dangerouslySetInnerHTML={{__html: item.text}}>

          </div>}
          {_type === 'Header' && <h2 className={"whtie_space_pre"} dangerouslySetInnerHTML={{__html: item.text}}>

          </h2>} {_type === 'Header2' && <h4 className={"whtie_space_pre"} dangerouslySetInnerHTML={{__html: item.text}}>

        </h4>}
          {_type === 'Video' && <iframe width="420" height="315"
                                        src={`https://www.youtube.com/embed/${item.value}?autoplay=0`}>
          </iframe>}
          {_type === 'Img' && <img src={(item.value || '').indexOf("http") === 0 ? item.value : domain + item.value} alt={item.value2}/>}
        </div>
      </div>


    </div>)
  }

}

global.BlogItem = BlogItem;

export default BlogItem
