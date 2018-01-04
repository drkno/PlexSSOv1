const config = require('config');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const crypto = require('crypto');
const util = require('util');

const background = require('./background');
const plex = require('./plex');

let passwords;
try {
    passwords = require('../config/passwords.json');
}
catch (e) {
    passwords = [];
}
const strategies = {
    basic: require('./strategy/basicauth')(passwords),
    sabnzbd: require('./strategy/sabnzbd')(passwords),
    jackett: require('./strategy/jackett')(passwords)
};

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
    app.use(morgan('tiny'));

    const cekey = await newKey();

    const updateSession = (req, loggedIn = false) => {
        req.session.data = encrypt({
            nowInMinutes: Math.floor(Date.now() / 60e3),
            loginStatus: !!loggedIn
        }, cekey);
    };

    const keys = [];
    for (let i = 0; i < config.get('keycount'); i++) {
        const key = await newKey();
        keys.push(key);
    }
    app.use(cookieSession({
        name: 'kPlexSSOKookie',
        keys: keys,
        maxAge: config.get('sessionexpiry'),
        domain: config.get('cookiedomain') || void(0)
    }));

    app.get('/api/v1/background', async(req, res) => {
        res.json({
            url: await background()
        });
    });

    app.all('/api/v1/sso', async(req, res) => {
        const loginData = decrypt(req.session.data, cekey);
        if (loginData.loginStatus) {
            for (let s in strategies) {
                const data = req.header(`X-PlexSSO-${s}`);
                if (data) {
                    await strategies[s](data, req, res);
                }
            }
        }
        updateSession(req, loginData.loginStatus);
        res.status(loginData.loginStatus ? 200 : 401).json({
            success: !!loginData.loginStatus
        });
    });

    app.post('/api/v1/login', async(req, res) => {
        let response = {
            success: false,
            data: null
        };
        try {
            const loginData = await plex.login(req.body.username, req.body.password);
            response.success = true;
            response.data = loginData;
        }
        catch (e) {
            response.success = false;
            response.data = e.message;
        }

        updateSession(req, response.success);
        res.status(response.success ? 200 : 401).json(response);
    });

    app.get('/api/v1/logout', (req, res) => {
        updateSession();
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
