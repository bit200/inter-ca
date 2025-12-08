const {FieldsWrapper} = window.my;

class Test extends ReactExtender {

  constructor(props) {
    super(props);
    let item = {steps: '[{}]'};
    this.api_url = '/admin/formuls/detailed';
    this.pre_update = (item) => {
     //console.log('........ ## item pre update', item);
      return item;
    };
    this.pre_get = (item) => {
      return _.extend(item, {steps: [{}, {}]})
    };
    item.steps = m.parse(item.steps_str, [])
    this.get_one();
    this.get()
    this.get_ls(['selected_indexes'])



    this.state = {api_loading: true}
  }

  botan_king() {
    let go = (tree) => _this.build_super_v_full_tree(tree, {with_id: true})

  }

  methods() {
    m.from_to(0, 23) // => [0, 1, 2, 3..., 23]
    this.update_ls(['selected_indexes'])
    this.update_ls_all()
  }

  render() {
    let {item} = this.state;
    return (<div>
      <div>{this.props.children}</div>

      <MyMonacoEditor
        // options={options} { selectOnLineNumbers: true }
        height="200"
        language={type === 'js' ? 'javascript' : type}
        theme="vs-dark"
        value={value}
        onChange={(value) => {
          this._onChange({value, type})
        }}
      >
      </MyMonacoEditor>
      <Hr small={true}/>

      <List
        deep_fields={['item', 'steps']}
        childs={['name#6', 'url#6', '#Hr']}
        btn_add={"+ Add a step"}
        color={1}
        _this={this}
      >
      </List>
      <List
        _this={this}
        deep_fields={['item', 'steps']}
        component={Test}
      ></List>

      <FieldsWrapper
        tt={222}
        item={item}
        deep_fields={['item', 'articles', 2]} //or steup item directly
        fields={[
          'name',
          '#Positions',
          '#Hr',
          {
            key    : 'articles',
            btn_add: '+ My Name',
            color  : 1,
            childs : ['name#6', 'url#6', '#Hr']
          }
        ]}
      >
      </FieldsWrapper>

      <MainWrapper>
        <WhiteWrapper>Content</WhiteWrapper>
      </MainWrapper>

      <Loading value={loading}>Content</Loading>

      <Checkboxes
        title={'Position'}
        items={ms.positions}
        selected_items={positions}
        onChange={(value, key) => {
          this._onChange(value, 'positions')
        }}
      >
      </Checkboxes>

      <Select
        value={category}
        title={"Category"}
        items={filtered_categories}
        onChange={(value) => {
         //console.log('........ ## ON CAHGNE CATEGORY', value);
          this._onChange(value, 'category')
        }}
      >
      </Select>


      <ButtonUpdate _this={this}>Update</ButtonUpdate>
      {/* w100 labelPadding */}
      <Button
        className={"pull-right"}
        disabled={this.api_updating}
        onClick={(scb, ecb) => this.api_update({scb, ecb})}>
        Update
      </Button>

      <Input
        _this={this}
        deep_fields={arr} //can be just fields
        placeholder={"Test"}

      />

      <Input fields={['item', 'article']}
             _this={this}
             autoselect={true}
             autosize={true}
             autofocus={true}
             is_ls={true}
             ib={true} //inline-block
             placeholder={"Insert vk profile of vk link etc."}
             onEnterClick={this.refs.check_btn}
             onEnter={() => {
             }}
      />

      <Input start_value={item[key]}
             _key={key}
             _this={this}
             autofocus={true}
             onChange={(value, _key) => {
               item[key] = value;
               this.update(item)
             }}
      />
      <Input _this={this}
             ls_key={'selected_index'}
             placeholder={"Selected Indexes"}
             autofocus={true}
             onEnterClick={this.refs.check_btn}
      />

    </div>)
  }

}

const ROUTING = {
  tasks: {
    top_filters: [{
      key: 'teams',
      arr: ['Ch1', 'Ch2']
    }],
    url        : '/admin/tasks',
    tabs       : [
      '_id#textarea#12',
      ['Category', ({item}) => (<div>div</div>)],
      'cd'
    ],
    edit       : [
      '#TaskAdmin#12',
      {
        color : 1, //default 0 = purple
        key   : 'articles',
        childs: ['name#6', '#Hr']
      }
    ],
    modal_size : 'full',
    on_add_obj : {
      desc: [{value: 'Question'}],
    },
    required   : ['position', 'category']
  },
};


export default Test
