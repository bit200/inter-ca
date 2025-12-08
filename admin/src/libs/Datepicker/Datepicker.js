import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


class Datepicker extends React.Component {
    state = {
        date: new Date(),
    }

    onChange = date => this.setState({date})


    render() {
        let {value, is_month, from, to} = this.props;
        if (value) {
            value = new Date(value)
        }

        function getYear(v) {
            return v.getFullYear();
        }

        function getMonth(v) {
            return v.getMonth();
        }

        const years = global.m.from_to(from || 1980, to || getYear(new Date()) + 1, 1);
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];

        let is_new = is_month;
        // value = '22/12/18'
        let label = this.props.label || this.props.name;
        // console.log("qqqqq this.props",this.props );
        return (<div>
            {label && <div><small>{t(label)}</small></div>}
            {/*<DayPicker selectedDays={new Date()} />*/}
            {/*<h3>DayPickerInput</h3>*/}
            {/*<DayPickerInput placeholder="DD/MM/YYYY" format="DD/MM/YYYY" />*/}
            {/*<DateTimeField value={value} onChange={(v) => {*/}
            {/* // console.log'*........ ## eeeee', v);*/}
            {/*  this.props.onChange && this.props.onChange(v)*/}
            {/*}}/>*/}
            <DatePicker
                selected={value}
                onChange={this.props.onChange}
                dateFormat="dd/MM/yyyy"
                // showMonthYearPicker
                renderCustomHeader={({
                                         date,
                                         changeYear,
                                         changeMonth,
                                         decreaseMonth,
                                         increaseMonth,
                                         prevMonthButtonDisabled,
                                         nextMonthButtonDisabled
                                     }) => (
                    <div
                        style={{
                            margin        : 10,
                            display       : "flex",
                            justifyContent: "center"
                        }}
                    >
                        <button className={'btn btn-xs btn-default'} onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>
                            {"<"}
                        </button>
                        <select
                            value={getYear(date)}
                            onChange={({target: {value}}) => changeYear(value)}
                        >
                            {years.map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>

                        <select
                            value={months[getMonth(date)]}
                            onChange={({target: {value}}) =>
                                changeMonth(months.indexOf(value))
                            }
                        >
                            {months.map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>

                        <button className={'btn btn-xs btn-default'}  onClick={increaseMonth} disabled={nextMonthButtonDisabled}>
                            {">"}
                        </button>
                    </div>
                )}
            />
        </div>)
    }

}

global.Datepicker = Datepicker;

export default Datepicker
