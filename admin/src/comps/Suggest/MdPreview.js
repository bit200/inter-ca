import React, {useState} from 'react';
import _ from 'underscore';

import {
    Link, Outlet
} from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";


function Layout2(props) {
    let {source} = props;

    //console.log("qqqqq sourcesourcesource !!!! ", source);
    // let v = useActionData();
    return <ErrorBoundary source={source}>
    <MDEditor.Markdown source={source}/>
    </ErrorBoundary>
}

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
                <pre>
            {this.props.source}
          </pre>
            );
        }

        // Render children if no error occurred
        return this.props.children;
    }
}


export default Layout2
