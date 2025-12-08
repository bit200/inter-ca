
// import { useState } from React;
import Temp from './Temp.js'
// import './Temp.css';

console.log("temp", Temp)
    const Counter = () => {
      const [count, setCount] = useState(0);

      const increment = () => {
        setCount(count + 1);
      };

      return (
        <div>
<Temp></Temp>
          <p>Count: {count}</p>
          <button onClick={increment}>Increment</button>
        </div>
      );
    };

    // Render the component to the 'root' element
    ReactDOM.render(<Counter />, document.getElementById('root'));
