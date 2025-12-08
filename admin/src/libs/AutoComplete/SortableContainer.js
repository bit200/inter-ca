import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

class SortableContainer extends Component {
  render() {
    return <span>{this.props.children}</span>;
  }
}

SortableContainer.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};

export default DragDropContext(HTML5Backend)(SortableContainer);