const cachedPasswords = {};

const util = require('util');
const request = require('request');
const Cookies = require('cookies');

const requestp = util.promisify(request);

module.exports = passwords => {
    for (let password of passwords) {
        if (password.sabnzbdUrl) {
            cachedPasswords[password.name] = password;
            console.log(`Cached sabnzbd password for ${password.name}`);
        }
    }

    return async (app, req, res) => {
        const cookies = new Cookies(req, res);
        if (!cookies.get('login_cookie') && cachedPasswords[app]) {
            console.log(`Signing into sabnzbd with name ${app}.`);

            const p = cachedPasswords[app];
            const signInRes = await requestp({
                url: `${p.sabnzbdUrl}/login/`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: `username=${p.username}&password=${p.password}`
            });

            const rcookies = signInRes.headers['set-cookie'];
            for (let cookie of rcookies) {
                const spl = cookie.split(';')[0].split('=');
                cookies.set(spl[0], spl[1]);
            }
        }
    };
};
