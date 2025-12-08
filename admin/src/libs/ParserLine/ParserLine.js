import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import Input from './../Input/Input';
//let {ReactExtender} = window.my;

class ParserLine extends ReactExtender {

  render() {
    return (<div>
       <Input _key={"sel"} wolabel={true} onChange={(value) => {
         this.props.onChange(value, 'sel')
       }}/>
       <Input _key={"regexp"} wolabel={true} onChange={(value) => {
         this.props.onChange(value, 'sel')
       }}/>
    </div>)
  }

}

export default ParserLine
