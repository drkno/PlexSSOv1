const cachedPasswords = {};

const util = require('util');
const request = require('request');
const Cookies = require('cookies');

const requestp = util.promisify(request);

module.exports = passwords => {
    for (let password of passwords) {
        if (password.jackettUrl) {
            cachedPasswords[password.name] = password;
            console.log(`Cached jackett password for ${password.name}`);
        }
    }

    return async (app, req, res) => {
        const cookies = new Cookies(req, res);
        if (!cookies.get('JACKETT') && cachedPasswords[app]) {
            console.log(`Signing into jackett with name ${app}.`);

            const p = cachedPasswords[app];
            const signInRes = await requestp({
                url: `${p.jackettUrl}/UI/Dashboard`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: `password=${p.password}`
            });

            const rcookies = signInRes.headers['set-cookie'];
            for (let cookie of rcookies) {
                const spl = cookie.split(';')[0].split('=');
                cookies.set(spl[0], spl[1], {
                    maxAge: config.get('sessionexpiry')
                });
            }
        }
    };
};
