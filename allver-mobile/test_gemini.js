const fetch = require('node-fetch');

const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_GEMINI_API_KEY";

console.log("Sending request to Google Gemini API...");
console.log("URL (masked key): https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_GEMINI_API_KEY");

fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    contents: [
      {
        parts: [
          { text: "Hello" }
        ]
      }
    ]
  })
})
.then(async (res) => {
  console.log("HTTP Status Code:", res.status);
  const text = await res.text();
  console.log("Full HTTP Response Body:\n", text);
})
.catch((err) => {
  console.error("Request failed with network error:", err);
});
