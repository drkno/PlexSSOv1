#!/bin/bash
set -e

cd sso
npm install
npm run build
cd ../auth
npm install
cd config
echo << EOF > production.json
{
    "webroot": "../sso/build",
    "cookiedomain": "",
    "plexservername": "",
    "fanarttvapikey": ""
}
EOF

echo << EOF > passwords.json
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
EOF

cd ../../
echo "Build complete. Edit auth/config/production.json and auth/config/passwords.json with the required settings."
echo "See the nginx directory for an example nginx configuration."
echo ""
echo "To start the server:"
echo " - cd auth"
echo " - NODE_ENV=production node src/index.js"
