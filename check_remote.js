const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('systemctl status nginx; pm2 list', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => console.log('STDOUT: ' + data))
          .stderr.on('data', (data) => console.log('STDERR: ' + data));
  });
}).connect({
  host: '5.252.155.147',
  port: 22,
  username: 'root',
  password: 'os1mw7Xk7U6t3lG5'
});
