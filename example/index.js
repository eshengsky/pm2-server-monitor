const http = require('http');
const port = 3001;
const monitor = require('../lib/index');
monitor({
    name: 'local',
    port
});


const server = http.createServer((req, res) => {
    res.end('OK');
});
server.listen(port);
console.log(`Example server is running on http://127.0.0.1:${port}`);
