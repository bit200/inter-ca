import React, { Component } from 'react';
import { PropTypes as PT } from 'prop-types';
import ReactSelect from 'react-select';
import 'react-select/dist/react-select.css';
import { arrayMove } from 'react-sortable-hoc';
import {
  DragHandle,
  DraggableItemWrap,
  DraggableList
} from './DraggableWrappers';
import './style.scss'

/**
 * Draggable react select
 */
class InputDraggableSelect extends Component {
  valueRenderer = option => (
    <DragHandle>{option.label}</DragHandle>
  )

  // Function for setting array on drag
  onSortEnd = ({ oldIndex, newIndex }) => {
    this.props.updateOrder(arrayMove(this.props.value, oldIndex, newIndex));
  }

  render() {
    const { creatable, value } = this.props;

    return (
      <DraggableList axis="xy"
                     shouldCancelStart={() => value && value.length < 2}
                     onSortEnd={props => this.onSortEnd(props)}
                     useDragHandle={true}
                     helperClass="draggable-dragging">
        {creatable ? (
          <ReactSelect.Creatable {...this.props}
                                 value={value}
                                 multi={true}
                                 valueRenderer={this.valueRenderer}
                                 valueComponent={DraggableItemWrap} />
        ) : (
          <ReactSelect {...this.props}
                       value={value}
                       multi={true}
                       valueRenderer={this.valueRenderer}
                       valueComponent={DraggableItemWrap} />
        )}
      </DraggableList>
    );
  }
}

InputDraggableSelect.propTypes = {
  updateOrder: PT.func.isRequired, // Changes order of sort
  onChange: PT.func.isRequired, // Change value
  value: PT.array,
  creatable: PT.bool,
};

export default InputDraggableSelect;