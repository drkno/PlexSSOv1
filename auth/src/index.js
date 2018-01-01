const config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const request = require('request');
const xml2js = require('xml2js');
const crypto = require('crypto');
const util = require('util');

const encrypt = (data, key) => {
    const cipher = crypto.createCipher('aes256', key);
    return cipher.update(JSON.stringify(data), 'utf8', 'hex') + cipher.final('hex');
};

const decrypt = (str, key) => {
    try {
        const decipher = crypto.createDecipher('aes256', key);
        return JSON.parse(decipher.update(str, 'hex', 'utf8') + decipher.final('utf8'));
    }
    catch (e) {
        return {};
    }
};

const newKey = async() => {
    const bitsPerKey = config.get('keybits');
    const data = await util.promisify(crypto.randomBytes)(bitsPerKey);
    return data.toString('hex');
};

const main = async() => {
    const app = express();

    app.use(bodyParser.urlencoded({ extended: true }));

    const cekey = await newKey();

    const keys = [];
    for (let i = 0; i < config.get('keycount'); i++) {
        const key = await newKey();
        keys.push(key);
    }
    app.use(cookieSession({
        name: 'kPlexSSOKookie',
        keys: keys,
        maxAge: config.get('sessionexpiry'),
        domain: config.get('domain') || void(0)
    }));

    app.get('/api/v1/background', (req, res) => {
        request(`${config.get('ombi')}/api/v1/Images/background/`, (err, _, body) => {
            if (err) {
                res.status(500).send(body);
            }
            else {
                res.json(JSON.parse(body));
            }
        });
    });

    app.all('/api/v1/sso', (req, res) => {
        const loginData = decrypt(req.session.data, cekey);
        loginData.nowInMinutes = Math.floor(Date.now() / 60e3);
        loginData.loginStatus = !!loginData.loginStatus;
        req.session.data = encrypt(loginData, cekey);
        res.status(loginData.loginStatus ? 200 : 401).json({
            success: loginData.loginStatus
        });
    });

    app.post('/api/v1/login', (req, res) => {
        const username = req.body.username || '';
        const password = req.body.password || '';
        request({
            url: 'https://plex.tv/users/sign_in.json',
            method: 'POST',
            headers: {
                'X-Plex-Client-Identifier': 'PlexSSOv1',
                'X-Plex-Product': 'PlexSSO',
                'X-Plex-Version': '3',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json'
            },
            body: `user[login]=${username}&user[password]=${password}`
        }, (err, r, body) => {
            let success = false,
                data = null;
            try {
                body = JSON.parse(body);
            }
            catch (e) {
                body = {
                    user: {
                        authentication_token: ''
                    }
                };
            }

            request(`https://plex.tv/api/resources?includeHttps=1&includeRelay=1&X-Plex-Product=PlexSSO&X-Plex-Client-Identifier=PlexSSOv1&X-Plex-Token=${data.user.authentication_token}`,
                (err2, r2, body2) => {
                xml2js.parseString(body2, (err3, result) => {
                    if (err || err2 || err3) {
                        result = {
                            MediaContainer: {
                                Device: []
                            }
                        }
                    }
                    let exists = false;
                    try {
                        const servers = result.MediaContainer.Device.map(d => d['$'].name);
                        exists = servers.indexOf(config.get('plexservername')) >= 0;
                    }
                    catch (e) {}

                    if (exists) {
                        success = true;
                        data = body;
                    }
                    else {
                        data = 'Login failed. Please check your login details.';
                        req.session.data = encrypt({
                            nowInMinutes: Math.floor(Date.now() / 60e3),
                            loginStatus: success
                        }, cekey);

                        res.status(success ? 200 : 401).json({
                            success: success,
                            data: data
                        });
                    }
                });
            });
        });
    });

    app.get('/api/v1/logout', (req, res) => {
        req.session.data = encrypt({
            nowInMinutes: Math.floor(Date.now() / 60e3),
            loginStatus: false
        }, cekey);
        res.status(200).json({
            success: true
        });
    });

    app.use(express.static(config.get('webroot')));

    app.get('*', (req, res) => {
        res.redirect('/index.html');
    });

    const port = config.get('port');
    app.listen(port, () => console.log(`Listening at http://*:${port}`));
};
main();
