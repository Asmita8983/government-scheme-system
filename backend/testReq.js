const fetch = require('node-fetch'); // node v18 has native fetch built-in, no need for require actually, assuming Node > 18
async function test() {
    const result = await fetch("http://localhost:5000/api/analytics/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "test1", page: "/" })
    });
    const text = await result.text();
    console.log("Status:", result.status);
    console.log("Response:", text);
}
test();
