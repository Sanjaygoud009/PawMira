const http = require('http');

// Test with Origin header to simulate browser request
const body = JSON.stringify({ name: 'Test', email: 'test@example.com', message: 'Hello PawMira!' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/contact',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Origin': 'http://localhost:5173',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('CORS header:', res.headers['access-control-allow-origin']);
    console.log('Response:', data);
  });
});

req.on('error', (e) => { console.error('ERROR:', e.message); });
req.write(body);
req.end();
