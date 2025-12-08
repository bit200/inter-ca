import {useEffect, useState} from "react";
import {sseFetch} from "./SseFetch";

export default function SseTest() {
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        return;
        // setIsConnected(true);
        //
        // // Example: query can be object or string (or undefined/null for no params)
        // const query = {
        //     session_id: 'u1002_1004_54wjcthp7a9y6133b31xhh0i5uwza6c0fct3gxytiwz6o025au',
        // };
        //
        // setMessages([])
        // const cleanup = sseFetch({
        //         url: 'http://localhost:3010/full_test_new_sse',
        //         query,
        //         on_msg: (data) => {
        //             let {name, _data} = data;
        //             console.log("qqqqq UnitTests detail", {name, _data});
        //             setMessages(prev => [...prev, data])
        //         },
        //         on_response: (data) => {
        //             console.log("qqqqq on response:::::", data);
        //         },
        //         on_complete: (finalMsg) => {
        //             console.log("qqqqq final msg complete", finalMsg);
        //             setIsConnected(false);
        //         }
        //     }
        // );
        //
        // return cleanup; // Clean up SSE connection on unmount
    }, []);

    return (
        <div>
            <h1>SSE Test</h1>
            <iframe src="http://localhost:1034/frame.html?url=http://localhost:1034/condition.html#session_id=u1002_1545_dtri1au5cijswtirjfg06obu0qx8trym36i5op87mo9b93rd81" frameborder="0"></iframe>

            <div>Status: {isConnected ? "Connected" : "Disconnected"}</div>
            <ul>
                {messages.map((msg, index) => (
                    <li key={index}>
                        {msg.message || msg.name}
                    </li>
                ))}
            </ul>
        </div>
    );
}