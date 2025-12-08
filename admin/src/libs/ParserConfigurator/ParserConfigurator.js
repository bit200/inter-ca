import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import Button from './../Button/Button';
import Input from './../Input/Input';
import DeleteButton from './../DeleteButton/DeleteButton';
import Select from './../Select/Select';
import Hr from './../Hr/Hr';
import Checkbox from './../Checkbox/Checkbox';
import Textarea from './../Textarea/Textarea';

class ParserConfigurator extends ReactExtender {

  debugIt(opts) {
   // console.log'........ ## DEBUG it clicked');
   // console.log'........ ## DEBUG it clicked');
   // console.log'........ ## DEBUG it clicked');
    this.props.emitToParent && this.props.emitToParent({method: 'debug-it', params: opts});
  }

  render() {
    let {item = {}} = this.state;

    return (<div >
      {item.plain}
      <Textarea value={item.plain} onChange={(value) => this.deepUpdate(['item', 'plain'], value)}></Textarea>
      <Button className="pull-right" disabled={false} color={1} onClick={(e) => {
        this.onAdd('blocks')
      }}>+ Add a block</Button>
      {(item.blocks || []).map((block, index) => {
        let key = 'sel';
        let key2 = 'key';
        return (<div key={index}>
          <div className="row">
            <div className={'col-xs-12'}>
              <DeleteButton onClick={(e) => {
                this.onRemove('blocks', key)
              }}></DeleteButton>
              <div className="debug-it" onClick={() => this.debugIt({block})}></div>
            </div>
            <Input _key={key2} value={block[key2]} item={block}
                   size={6}
                   onChange={(value) => {
                     this.deepUpdate(['item', 'blocks', index, key2], value)
                   }}/>
            <Input _key={key} value={block[key]} item={block}
                   size={6}
                   onChange={(value) => {
                     this.deepUpdate(['item', 'blocks', index, key], value)
                   }}/>

            <div className="col-xs-1">
              <Checkbox title={'is Arr'} type={"checkbox"} value={block.is_arr} onChange={(value) => {
                this.deepUpdate(['item', 'blocks', index, 'is_arr'], value)
              }}/>
            </div>

            <div className="col-xs-5">
              <b>
                <small>Validations:</small>
              </b>
              <Button disabled={false} color={1}
                      className={"pull-right"}
                      onClick={(e) => {
                        this.deepItemUpdate(['blocks', index], 'validations', {}, 'push')
                      }}>+</Button>
              <div className="separator"></div>
              <ValidationData
                debugIt={(opts) => this.debugIt(opts)}
                deepUpdate={(arr, v, k) => this.deepUpdate(arr, v, k)}
                block={block} type={'validations'} block_index={index}></ValidationData>
            </div>
            <div className="col-xs-6">
              <b>
                <small>Data:</small>
              </b>
              <Button disabled={false} color={1}
                      className={"pull-right"}
                      onClick={(e) => {
                        this.deepItemUpdate(['blocks', index], 'data', {}, 'push')
                      }}>+</Button>
              <div className="separator"></div>
              <ValidationData
                debugIt={(opts) => this.debugIt(opts)}
                deepUpdate={(arr, v, k) => this.deepUpdate(arr, v, k)}
                block={block} type={'data'} block_index={index}></ValidationData>
            </div>
            <Hr/>
          </div>
        </div>)
      })}
    </div>)
  }

}


class ValidationData extends ReactExtender {

  render() {
    let {block, type, block_index, deepUpdate} = this.props;
    return (<div>

      {(block[type] || []).map((item, ind) => {
        let _keys = type === 'data' ? ['key', 'sel'] : ['sel', 'regexp'];
        let key = 'attr'
        return (<div key={ind}>
          <DeleteButton onClick={(e) => {
            deepUpdate(['item', 'blocks', block_index, type], ind, 'pop')
          }}></DeleteButton>
          <div className="debug-it"
               onClick={() => this.props.debugIt({block, type, ind})}
          >

          </div>

          {(_keys || []).map((key, ind2) => {
            return (<div key={ind2}>
              <Input _key={key} value={item[key]} item={item}
                     wolabel={true}
                     onChange={(value) => {
                       deepUpdate(['item', 'blocks', block_index, type, ind, key], value)
                     }}/>
            </div>)
          })}

          <div className="row">
            <div className="col-xs-8">
              <Input _key={key} value={item[key]} item={item}
                     wolabel={true}
                     onChange={(value) => {
                       deepUpdate(['item', 'blocks', block_index, type, ind, key], value)
                     }}/>
            </div>
            <div className="col-xs-4">
              <Select items={['text', 'attr']}
                      selected={item.type} onChange={(value) => {
                deepUpdate(['item', 'blocks', block_index, type, ind, 'type'], value)
              }}></Select>
            </div>
          </div>
          {type === 'data' && <div className="row">
            <div className="col-xs-12">
              <Input _key={'post_remover'} value={item['post_remover']} item={item}
                     wolabel={true}
                     onChange={(value) => {
                       deepUpdate(['item', 'blocks', block_index, type, ind, 'post_remover'], value)
                     }}/>
            </div>
          </div>}


          <Hr small={true}/>
        </div>)
      })}
    </div>)
  }
}

export default ParserConfigurator
