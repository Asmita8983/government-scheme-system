const axios = require('axios');
axios.post('http://localhost:5000/api/chat', { message: 'Hello! Who made you?' })
    .then(r => console.log(JSON.stringify(r.data, null, 2)))
    .catch(e => console.log(e.message));
