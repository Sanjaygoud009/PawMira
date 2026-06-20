const axios = require('axios');

async function testApi() {
  try {
    const res = await axios.post('https://pawmira.onrender.com/api/auth/register', {
      name: 'Test User',
      email: 'pixelcraftersnetwork@gmail.com',
      password: 'password123',
      role: 'volunteer'
    });
    console.log('SUCCESS:', res.status, res.data);
  } catch (err) {
    console.log('ERROR:', err.response?.status, err.response?.data || err.message);
  }
}
testApi();
