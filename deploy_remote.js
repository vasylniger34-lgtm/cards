const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(`
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y curl git nginx
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    npm install -g pm2
    
    mkdir -p /var/www
    cd /var/www
    rm -rf cards
    git clone https://github.com/vasylniger34-lgtm/cards.git
    cd cards
    
    # Create .env
    echo "BOT_TOKEN=8773656758:AAHvGRqPVbFXdXvYZrRkb4mSBfaz4qKmjis" > .env
    echo "WEBAPP_URL=https://cards-eight-tau-72.vercel.app" >> .env
    echo "ADMIN_ID=8472692319" >> .env
    echo "PORT=3000" >> .env

    npm install
    cd webapp
    npm install
    npm run build
    cd ..

    # Nginx Config
    cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
    }
}
EOF
    systemctl restart nginx

    # Start Bot
    pm2 delete bot || true
    pm2 start bot.js --name bot
    pm2 save
    pm2 startup
  `, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '5.252.155.147',
  port: 22,
  username: 'root',
  password: 'os1mw7Xk7U6t3lG5'
});
