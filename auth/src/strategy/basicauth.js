const cachedPasswords = {};

const btoa = str => Buffer(str).toString('base64');

module.exports = passwords => {
    for (let password of passwords) {
        const authString = `${password.username}:${password.password}`;
        cachedPasswords[password.name] = `Basic ${btoa(authString)}`;
        console.log(`Cached basic-auth password for ${password.name}`);
    }

    const basicAuth = (app, req, res) => {
        if (cachedPasswords[app]) {
            console.log(`Adding basic auth header with name ${app}.`);
            res.header('Authorization', cachedPasswords[app]);
        }
    };
    return basicAuth;
};
