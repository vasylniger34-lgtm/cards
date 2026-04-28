const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`
    export DEBIAN_FRONTEND=noninteractive
    apt-get install -y certbot python3-certbot-nginx
    
    # Update Nginx with domain
    cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name inga-bieliakova.com www.inga-bieliakova.com;

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

    # Run Certbot (Auto-configure Nginx for SSL)
    certbot --nginx -d inga-bieliakova.com -d www.inga-bieliakova.com --non-interactive --agree-tos -m admin@inga-bieliakova.com

    # Update .env to use the new domain
    cd /var/www/cards
    sed -i 's|WEBAPP_URL=.*|WEBAPP_URL=https://inga-bieliakova.com|' .env
    pm2 restart bot
  `, (err, stream) => {
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
