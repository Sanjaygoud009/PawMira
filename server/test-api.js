const axios = require('axios');

async function testApi() {
  try {
    const res = await axios.get('https://pawmira.onrender.com/api/auth/test-email');
    console.log('SUCCESS:', res.status, res.data);
  } catch (err) {
    console.log('ERROR:', err.response?.status, err.response?.data || err.message);
  }
}
testApi();
