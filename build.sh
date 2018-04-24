#!/bin/bash
set -e

if [ "$EUID" -ne 0 ]; then
    echo "This script must be run as root"
    exit
fi

if command -v yarn >/dev/null 2>&1; then
    pkg_install="yarn"
    pkg_build="yarn run build"
    echo "Using 'yarn' package manager"
else
    pkg_install="npm install"
    pkg_build="npm run build"
    echo "Using 'npm' package manager"
fi

echo "Building web front-end"
cd sso
eval "$pkg_install"
eval "$pkg_build"
echo "Build complete"

echo "Building API back-end"
cd ../auth
eval "$pkg_install"
echo "Build complete"

echo "Generating example configuration files"
cd config
echo << EOF > production.json
{
    "webroot": "../sso/build",
    "cookiedomain": "<refer to 'Scope of Cookies': https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies>",
    "plexservername": "<name of your plex server>",
    "plexserverclientidentifier": "<plex server unique ID from https://plex.tv/api/resources?includeHttps=1&includeRelay=1>",
    "fanarttvapikey": "<fanart.tv API key>"
}

EOF

echo << EOF > passwords.json
[
    {
        "name": "common",
        "username": "admin",
        "password": "<my password>",
        "sabnzbdUrl": "http://127.0.0.1:8080",
        "jackettUrl": "http://127.0.0.1:9117"
    },
    {
        "name": "transmission",
        "username": "transmission",
        "password": "<my password>"
    }
]

EOF
cd ../../
echo "Configuration files generated"

if [ -d "/etc/nginx/conf.d" ]; then
    echo "Configuring Nginx"
    cp nginx/sso.conf /etc/nginx/conf.d/sso-example.conf
    cp nginx/sonarr.conf /etc/nginx/conf.d/sonarr-example.conf
    echo "Nginx configuration complete"
    echo "See sso-example.conf and sonarr-example.conf in /etc/nginx/conf.d/ for example Nginx configurations."
else
    echo "/etc/nginx/conf.d does not exist. Cannot setup example Nginx configuration."
    echo "See the nginx directory for an example Nginx configurations."
fi

if pidof systemd >/dev/null 2>&1; then
    echo "Configuring systemd"
    cp sso.service /etc/systemd/system/sso.service
    systemctl daemon-reload
    systemctl enable sso.service
    echo "systemd Configured"
    echo ""
    echo "To start the server:"
    echo "systemctl start sso"
else
    echo "This system does not use systemd. Startup will have to be manually configured."
    echo ""
    echo "To start the server:"
    echo " - cd auth"
    echo " - NODE_ENV=production node src/index.js"
fi

echo "Build complete. Edit auth/config/production.json and auth/config/passwords.json with the required settings then start the server."

