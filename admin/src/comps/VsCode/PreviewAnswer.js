import React, {useState} from 'react';

function PreviewAnswer(props) {
 //console.log('*........ ## ROOT RENDER', props);


  // let v = useActionData();
  return <div>
    Preview Answer
    <pre>{JSON.stringify(props.selected_block, null, 2)}</pre>
  </div>
}

export default PreviewAnswer
