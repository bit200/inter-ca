server {
server_name demo.itk.academy;

    gzip on;
    gzip_disable "msie6";

    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 256k;
proxy_buffer_size   128k;
proxy_buffers   4 256k;
proxy_busy_buffers_size   256k;

root /home/user/landings-gen/interviews/admin/build;
index index.html;
# ssl_certificate      /etc/nginx/app-gen_online.crt;
#ssl_certificate_key  /etc/nginx/app-gen_online.pem;

location @pr {
#    proxy_set_header   X-Forwarded-For $remote_addr;
#   proxy_set_header   Host $http_host;
    proxy_pass http://127.0.0.1:100;

#        root /home/user/landings-gen/interviews/admin;
#       try_files /build$uri /build/index.html;
#      expires 1h;

}
#location = / {
#root /home/user/landings-gen/interviews/admin/build;
#index index.html;
#
#}
# location / {
#root /home/user/landings-gen/interviews/admin/build;
#index /home/user/landings-gen/interviews/admin/build/index.html;
#expires 1h;
#}

#  location /.well-known/pki-validation/1E0CBC32A1C6A141E7F29D0877D41928.txt {
#   alias /etc/nginx/1E0CBC32A1C6A141E7F29D0877D41928.txt;
#  }
location /libs {
alias /home/user/landings-gen/interviews/admin/build/libs;
expires 1h;
}
location /css {
alias /home/user/landings-gen/interviews/admin/build/css;
expires 1h;
}
location /icons {
alias /home/user/landings-gen/interviews/admin/build/icons;
expires 1h;
}



location /static {
#    proxy_set_header   X-Forwarded-For $remote_addr;
#   proxy_set_header   Host $http_host;
#  proxy_pass http://127.0.0.1:100;

#        root /home/user/landings-gen/interviews/admin/build;
        alias /home/user/landings-gen/interviews/admin/build/static;
#try_files /static/$uri /124/index.html;
expires 1h;
}

location / {
try_files /index.html /index.html2;
expires 1h;


}
#root /home/user/landings-gen/interviews/admin/build;
#index index.html;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/demo.itk.academy/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/demo.itk.academy/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
if ($host = demo.itk.academy) {
return 301 https://$host$request_uri;
} # managed by Certbot


server_name demo.itk.academy;



    listen 80;
    return 404; # managed by Certbot


}



