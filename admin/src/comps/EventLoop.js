import React, {useState, useEffect, useRef} from 'react';
import _ from 'underscore';
// import Highlight from 'react-highlight'
// import Edit from './QuillEditor'
// import MonacoEditor from 'react-monaco-editor';
import Editor from '@monaco-editor/react';

import './eventLoop.css';
import Input from 'libs/Input';
import {
    Link, Outlet
} from "react-router-dom";


function Iframe() {
    useEffect(() => {
        function receiveMessage(event) {
            if (!(event.data || {})._type) {
                return;
            }
            // Check the origin of the message for security

            var data = event.data;

            // Process the received data
            // console.log('Received data from iframe:',event, data);
        }

        // Listen for the "message" event
        window.addEventListener('message', receiveMessage, false);

    }, [])
    let html = `<!DOCTYPE html>
  <html>
  <head>
  <title>Page Title</title>
  </head>
  <body>
  
  <h1>This is a Heading</h1>
  <p>This is a paragraph. ddd</p>
  
  <script>
  let res = [];
  let _log = console.log;
  console.clear();
 //console.log = (args) => {
    res.push(args[0]);
    _log.call(this, args)
  }
 //console.log('13');

  setTimeout(() => {
   //console.log('12');
    Promise.resolve().then(() => console.log('3')).then(() => console.log('9'));
  }, 0);
  
 //console.log('4');
  
  new Promise((resolve, reject) => {
  
    setTimeout(() => {
     //console.log('15')
    });
    
    Promise.resolve().then(() => console.log('8'))
    
   //console.log('6');
  });
  
  setTimeout(() => {
   //console.log('2');
  }, 100);
  
 //console.log('7');
  
  setTimeout(() => {
   //console.log('1');
  }, 0);
  
  Promise.resolve().then(() => console.log('14')).then(() => console.log('5'));
  
 //console.log('15');
  setTimeout(() => {
    console.error(res);
  }, 1000)
  
  </script></script>
  </body>
  </html>`
    return <>IFRAME
        <iframe srcDoc={html}>
        </iframe>
    </>
}


function Layout2(props) {
    let [code, setCode] = useState(getCode());
    let [res, setRes] = useState('');
    let [drag1, setDrag1] = useState(false);
    let [drag2, setDrag2] = useState(false)
    let [options, sedOptinos] = useState(getOpts());
    const parentTopRef = useRef(null);
    const parentLeftRef = useRef(null);
    const topRef = useRef(null);
    const botRef = useRef(null);

    useEffect(() => {
        let leftRef = parentTopRef
        topRef.current.style.height = Storage.get('codeResizeTop') || '40%'
        let perc = 100 - parseFloat(topRef.current.style.height);
        botRef.current.style.height = perc + '%'
        leftRef.current.style.width = Storage.get('codeResizeLeft') || '40%'

    }, [])

    // console.log('*........ ## ROOT RENDER', props);

    function editorDidMount() {
        // console.log('*........ ## did mount');
    }


    function onChange(newValue) {
       //console.log('*........ ## change', newValue);
        setCode(code);
    }

    function getHeight(el) {
        return el.clientHeight;
    }

    function getWidth(el) {
        return el.clientWidth;
    }

    // let v = useActionData();
    return <div className='editorWrapper runCodeWrap'>

        {/* <ResizableBlocks></ResizableBlocks> */}

        <div className='code-run' ref={parentLeftRef}
             onMouseUp={(e) => {
                 setDrag1(false)
                 setDrag2(false)
             }}
             onMouseDown={(e) => {
                 (e.target.getAttribute('id') === 'drag1') && setDrag1(true);
                 (e.target.getAttribute('id') === 'drag2') && setDrag2(true);


             }}
             onMouseMove={(e) => {
                 if (drag1) {
                     let MIN_MAX = 20
                     let y = e.clientY + 10;
                     let total = getHeight(parentTopRef.current)//.top
                     let perc = Math.min(100 - MIN_MAX, Math.max(MIN_MAX, Math.round(100 * (y / total)))) + '%';
                     topRef.current.style.height = perc;
                     Storage.set('codeResizeTop', perc)
                 } else if (drag2) {
                     let leftRef = parentTopRef;
                     let MIN_MAX = 20
                     let x = e.clientX - 10;
                     let total = getWidth(parentLeftRef.current)//.top
                     let perc = Math.min(100 - MIN_MAX, Math.max(MIN_MAX, Math.round(100 * (x / total)))) + '%';
                     leftRef.current.style.width = perc;
                     Storage.set('codeResizeLeft', perc)
                 }

             }}
        >
            <div className='code-run-left' id="top-wrap"

                 ref={parentTopRef}
            >

                <div className='code-run-top' ref={topRef}>

                    <div>
                        <Highlight className='js'>
                            {code}
                        </Highlight>
                    </div>
                    <div id="drag1"
                         className='code-run-top-drag'
                    >
                    </div>
                </div>
                {/* <div className="for-drag"> */}

                {/* </div> */}

                <div className='code-run-bot' ref={botRef}>
                    <div>
                        {/* BOT */}
                        <Input placeholder="Ваш ответ, например 1,2,4,5,6 " value={res} onChange={(r) => {
                            setRes(r)
                        }}/>
                        <div style={{background: 'orange', height: '2000px'}}></div>
                        {/* <Iframe /> */}
                    </div>
                </div>

                <div id="drag2"
                     className='code-run-left-drag'
                >
                </div>
            </div>
            <div className='code-run-right'>
                <div>
                    {/*<Editor*/}
                    {/*    height="100vh"*/}
                    {/*    defaultLanguage="javascript"*/}
                    {/*    defaultValue="// some comment"*/}
                    {/*    value={code}*/}
                    {/*    onChange={onChange}*/}
                    {/*/>;*/}
                </div>
            </div>
        </div>
    </div>
}

function getCode() {
    let str = `
console.log('1');

setTimeout(() => {
 //console.log('2');
  Promise.resolve().then(() => console.log('3')).then(() => console.log('4'));
}, 0);

console.log('11');

new Promise((resolve, reject) => {

  setTimeout(() => {
   //console.log('8')
  });
  
  Promise.resolve().then(() => console.log('10'))
  
 //console.log('9');
});

setTimeout(() => {
 //console.log('13');
}, 100);

console.log('12');

setTimeout(() => {
 //console.log('5');
}, 0);

Promise.resolve().then(() => console.log('6')).then(() => console.log('7'));

console.log('8');`;

    let nums = _.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    let repl = str.replace(/[0-9]+/gi, (...args) => {
        let v = +args[0];
        return v == 0 || v > 99 ? v : nums[v - 1]
    });


    // return '<p><span style="color: rgb(230, 0, 0); background-color: rgb(255, 255, 0);">asdfdasdf</span></p><p><br></p><p><br></p><p><span style="color: rgb(230, 0, 0); background-color: rgb(255, 255, 0);">asdfa</span></p><p>asdfasdfd</p><p><br></p><pre class="ql-syntax" spellcheck="false">var code = `asdfasdfa`\n' +
    //   '</pre>'
    return repl;
}


function getOpts() {
    return {
        // selectOnLineNumbers: true,
        // readOnly: true,
        "acceptSuggestionOnCommitCharacter": true,
        "acceptSuggestionOnEnter": "on",
        "accessibilitySupport": "auto",
        "autoIndent": false,
        "automaticLayout": true,
        "codeLens": true,
        "colorDecorators": true,
        "contextmenu": true,
        "cursorBlinking": "blink",
        "cursorSmoothCaretAnimation": false,
        "cursorStyle": "line",
        "disableLayerHinting": false,
        "disableMonospaceOptimizations": false,
        "dragAndDrop": false,
        "fixedOverflowWidgets": false,
        "folding": true,
        "foldingStrategy": "auto",
        "fontLigatures": false,
        "formatOnPaste": false,
        "formatOnType": false,
        "hideCursorInOverviewRuler": false,
        "highlightActiveIndentGuide": true,
        "links": true,
        "mouseWheelZoom": false,
        "multiCursorMergeOverlapping": true,
        "multiCursorModifier": "alt",
        "overviewRulerBorder": true,
        "overviewRulerLanes": 2,
        "quickSuggestions": true,
        "quickSuggestionsDelay": 100,
        "readOnly": true,
        "renderControlCharacters": false,
        "renderFinalNewline": true,
        "renderIndentGuides": true,
        "renderLineHighlight": "all",
        "renderWhitespace": "none",
        "revealHorizontalRightPadding": 30,
        "roundedSelection": true,
        "rulers": [],
        "scrollBeyondLastColumn": 5,
        "scrollBeyondLastLine": true,
        "selectOnLineNumbers": true,
        "selectionClipboard": true,
        "selectionHighlight": true,
        "showFoldingControls": "mouseover",
        "smoothScrolling": false,
        "suggestOnTriggerCharacters": true,
        "wordBasedSuggestions": true,
        "wordSeparators": "~!@#$%^&*()-=+[{]}|;:'\",.<>/?",
        "wordWrap": "off",
        "wordWrapBreakAfterCharacters": "\t})]?|&,;",
        "wordWrapBreakBeforeCharacters": "{([+",
        "wordWrapBreakObtrusiveCharacters": ".",
        "wordWrapColumn": 80,
        "wordWrapMinified": true,
        "wrappingIndent": "none"
    }
}

export default Layout2
