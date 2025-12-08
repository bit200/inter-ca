// import React, {useState} from "React"; --> that string is autoimport in our generator
//  --> that string is autoimport in our generator

const Temp = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <p>TEMP COUNTER: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
};

export default Temp