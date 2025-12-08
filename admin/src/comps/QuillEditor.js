import React, {useRef} from "react";
import MDEditor, {commands} from '@uiw/react-md-editor';
// import './QuillEditor.css';
// import 'highlight.js/styles/atom-one-dark-reasonable.css'


export default function QuillEditor(props) {
    const [value, setValue] = React.useState(props.value);
    const {onChange} = props;


    const title3 = {
        name: 'code',
        keyCommand: 'code',
        buttonProps: {'aria-label': 'Insert Code'},
        icon: (
            <div>Code</div>
        ),
        execute: (state, api) => {
            let modifyText = "```jsx\n" + state.selectedText + "\n```";
            if (!state.selectedText) {
                modifyText = '```jsx\n' +
                    '\n```';
            }
            api.replaceSelection(modifyText);
        },
    };

    return (
        <div className="container">
            <MDEditor
                style={{height: '400px'}}
                value={value}
                // fullscreen={true}
                onChange={(v) => {
                    setValue(v);
                    onChange(v);
                }}
                // ref={editorRef}
                commands={[
                    // Custom Toolbars
                    title3,
                    commands.divider,
                    commands.group([commands.title1, commands.title2, commands.title3, commands.title4, commands.title5, commands.title6], {
                        name: 'title',
                        groupName: 'title',
                        buttonProps: {'aria-label': 'Insert title'}
                    }),
                    commands.bold,
                    commands.italic,
                    // commands.codeBlock,
                    commands.divider,
                    commands.hr,
                    commands.comment,
                    // commands.strikethrough,
                    commands.quote,
                    commands.divider,
                    commands.image,
                    commands.link,
                    commands.divider,
                    commands.checkedListCommand, commands.orderedListCommand, commands.unorderedListCommand,

                    // title2,

                    commands.divider,
                    // commands.group([], subChild),
                ]}
            />
            {/*<MDEditor.Markdown source={value} style={{whiteSpace: 'pre-wrap'}}/>*/}
        </div>
    );
}