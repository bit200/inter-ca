import React, { useState } from 'react';
import _ from 'underscore';
import MDEditor, { commands } from '@uiw/react-md-editor';
import Textarea from "libs/Textarea";


const title3 = {
    name: 'code',
    keyCommand: 'code',
    buttonProps: { 'aria-label': 'Insert Code' },
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

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    componentDidCatch(error, errorInfo) {
        // Catch errors and update state
        this.setState({
            hasError: true,
            error: error,
            errorInfo: errorInfo,
        });
    }

    render() {
        if (this.state.hasError) {
            // You can customize the error message and UI here
            return (
                <Textarea value={this.props.value} onChange={(v) => {
                   //console.log("qqqqq vvvvvv", v);
                    this.props.onChange && this.props.onChange(v)
                }}>
                </Textarea>
            );
        }

        // Render children if no error occurred
        return this.props.children;
    }
}



function MDEditorComp({ onChange, opts, defClass, value }) {

    opts = opts || {}
    let { readOnly, preview } = opts || {};
    function _onChange (v) {
        if (readOnly) {
            // onChange(value)
            global.notify.error('CANNOT EDIT::: Read Only Field')
            return
        }

        onChange(v)
    }


    // let v = useActionData();
    return <div className={defClass || ''} data-color-mode="light">
        <ErrorBoundary value={value} onChange={_onChange}>
            <MDEditor
                style={{ width: '100%' }}
                value={value}
                // fullscreen={true}
                onChange={_onChange}
                preview={preview || 'live'}
                commands={opts.commands || [
                    // Custom Toolbars
                    title3,
                    commands.divider,
                    commands.group([commands.title1, commands.title2, commands.title3, commands.title4, commands.title5, commands.title6], {
                        name: 'title',
                        groupName: 'title',
                        buttonProps: { 'aria-label': 'Insert title' }
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
                    commands.divider,
                    // commands.group([], subChild),
                ]}
            />
        </ErrorBoundary>
    </div>
}

export default MDEditorComp
