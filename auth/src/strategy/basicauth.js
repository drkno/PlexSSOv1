let passwords;
try {
    passwords = require('../config/passwords.json');
}
catch (e) {
    passwords = {};
}

const btoa = str => Buffer(str).toString('base64');

const cachedPasswords = {};

for (let app in passwords) {
    if (passwords.hasOwnProperty(app)) {
        cachedPasswords[app] = `Basic ${btoa(passwords[app])}`;
    }
}

const basicAuth = (app, req, res) => {
    res.header('Authorization', cachedPasswords[app] || '');
};

module.exports = basicAuth;
