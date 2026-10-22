const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyDIriRMptmJf47sTrXEGjvvCVuTm6xXUnE');
genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }).generateContent('Hi')
    .then(r => console.log('SUCCESS:', r.response.text()))
    .catch(e => console.error(JSON.stringify(e.message, null, 2)));
