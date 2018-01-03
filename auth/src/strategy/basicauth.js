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
        console.log(`Cached basic-auth password for ${app}`);
    }
}

const basicAuth = (app, req, res) => {
    if (cachedPasswords[app]) {
        console.log(`Adding basic auth header for app ${app}.`);
        res.header('Authorization', cachedPasswords[app]);
    }

};

module.exports = basicAuth;
