server {
server_name app.itkedu.com;

    gzip on;
    gzip_disable "msie6";

    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 256k;
    proxy_buffer_size   128k;
    proxy_buffers   4 256k;
    proxy_busy_buffers_size   256k;

    root /var/www/inter-ca/admin/build;
    index index.html;

    location /libs {
        alias /var/www/inter-ca/admin/build/libs;
        expires 1h;
    }
    location /css {
        alias /var/www/inter-ca/admin/build/css;
        expires 1h;
    }
    location /icons {
        alias /var/www/inter-ca/admin/build/icons;
        expires 1h;
    }

    location /static {
        #try_files /static/$uri /124/index.html;
        expires 1h;
    }

    location / {
        try_files /$uri /index.html /index.html2;
        expires 1h;
    }


    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/app.itkedu.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/app.itkedu.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}

server {
if ($host = app.itkedu.com) {
return 301 https://$host$request_uri;
} # managed by Certbot
    server_name app.itkedu.com;
    listen 80;
    return 404; # managed by Certbot
}



db.createUser({
user: "javacode",
pwd: "bestEducationEver",
roles: [
{ role: "readWrite", db: "javacodeDb" }
]
})
