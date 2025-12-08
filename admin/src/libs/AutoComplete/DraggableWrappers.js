import React, { Component } from 'react';
import { PropTypes as PT } from 'prop-types';
import {
  SortableHandle,
  SortableElement,
  SortableContainer
} from 'react-sortable-hoc';

/**
 * Draggable handle wraps the label
 */
const DragHandle = SortableHandle(({ children }) => <span>{children}</span>);

DragHandle.propTypes = {
  children: PT.node,
};

/**
 * Sortable wrapper for item, mirrors the Value component
 * https://github.com/JedWatson/react-select/blob/master/src/Value.js
 */
const DraggableItem = SortableElement(({ id, value, children, onRemove }) => {
  let dragging = false;

  const removeIt = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onRemove(value);
  };

  const handleTouchEndRemove = (event) => {
    // Check if the view is being dragged, In this case
    // we don't want to fire the click event (because the user only wants to scroll)
    if (dragging) return;

    // Fire the mouse events
    removeIt(event);
  };

  const handleTouchMove = () => {
    // Set a flag that the view is being dragged
    dragging = true;
  };

  const handleTouchStart = () => {
    // Set a flag that the view is not being dragged
    dragging = false;
  };

  return (
    <div className='Select-value'>
      <span className="Select-value-icon"
            aria-hidden="true"
            onMouseDown={removeIt}
            onTouchEnd={handleTouchEndRemove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}>
        &times;
      </span>
      <span className="Select-value-label" role="option" aria-selected="true" id={id}>
        {children}
      </span>
    </div>
  );
});

DraggableItem.propTypes = {
  id: PT.string,
  value: PT.object,
  onRemove: PT.func,
  children: PT.node,
};

/**
 * Hacky wrapping element necessary to pull index to pass to SortableElement
 */
const DraggableItemWrap = ({ id, ...props }) => {
  let index = 0;
  id.replace(/.*?-value-(.*)?$/igm, (m, p1) => {
    index = parseInt(p1, 10);
  });
  return <DraggableItem id={id} index={index} {...props} />;
};

DraggableItemWrap.propTypes = {
  children: PT.node,
  disabled: PT.bool,               // disabled prop passed to ReactSelect
  id: PT.string,                   // Unique id for the value - used for aria
  onClick: PT.func,                // method to handle click on value label
  onRemove: PT.func,               // method to handle removal of the value
  value: PT.object.isRequired,     // the option object for this value
};

/**
 * Sortable wrapper for list
 */
const DraggableList = SortableContainer(({ children }) => children);

DraggableList.propTypes = {
  children: PT.node,
};

export {
  DragHandle,
  DraggableItemWrap,
  DraggableList,
};