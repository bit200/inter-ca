import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import { DragSource, DropTarget } from 'react-dnd';

const ITEM_TYPE = 'sortable';

class SortableItem extends Component {
  onMouseDown(event) {
    event.stopPropagation(); // important! as react-select preventsDefault on mouseDown event, preventing also dragging
  }

  render() {
    const { isDragging, connectDragSource, connectDropTarget, className, children } = this.props;
    const opacity = isDragging ? 0 : 1;

    return connectDropTarget(connectDragSource(
      <span
        className={className}
        style={{ opacity }}
        onMouseDown={this.onMouseDown}
      >
                {children}
            </span>
    ));
  }
}

SortableItem.propTypes = {
  // props from react-dnd
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  // props provided by parent
  index: PropTypes.number.isRequired,
  children: PropTypes.element.isRequired,
  swapItems: PropTypes.func.isRequired,
  className: PropTypes.string,
};


const source = {
  beginDrag(props) {
    return {
      index: props.index,
    };
  },
};

const target = {
  hover(props, monitor, component) {
    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;

    // implement your own behaviour, below example taken from http://gaearon.github.io/react-dnd/examples-sortable-simple.html
    if (dragIndex === hoverIndex) {
      return;
    }

    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect();
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
    const clientOffset = monitor.getClientOffset();
    const hoverClientY = clientOffset.y - hoverBoundingRect.top;

    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return;
    }

    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return;
    }

    // when you want to swap items run
    props.swapItems(dragIndex, hoverIndex);

    // note: we're mutating the monitor item here!
    monitor.getItem().index = hoverIndex;
  },
};

function mapDropConnectToProps(connect) {
  return {
    connectDropTarget: connect.dropTarget(),
  };
}

function mapDragConnectToProps(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  };
}

export default DropTarget(ITEM_TYPE, target, mapDropConnectToProps)(DragSource(ITEM_TYPE, source, mapDragConnectToProps)(SortableItem));