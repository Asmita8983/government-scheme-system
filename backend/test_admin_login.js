const axios = require('axios');

const testLogin = async () => {
    try {
        const response = await axios.post('http://localhost:5000/api/admin/login', {
            username: 'admin',
            password: 'adminpassword123'
        });
        console.log('Login Success:', response.data);
    } catch (error) {
        console.error('Login Failed:', error.response ? error.response.status : error.message);
        if (error.response) console.error('Error Data:', error.response.data);
    }
};

testLogin();
