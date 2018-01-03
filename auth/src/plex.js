const config = require('config');
const request = require('request');
const xml2js = require('xml2js');
const util = require('util');

const requestp = util.promisify(request);
const xmlp = util.promisify(xml2js.parseString);

class PlexApi {
    constructor () {
        this._commonHeaders = {
            'X-Plex-Client-Identifier': 'PlexSSOv1',
            'X-Plex-Product': 'PlexSSO',
            'X-Plex-Version': '3'
        };
    }

    async login(username, password) {
        if (!username || !username.trim()) {
            throw new Error('A username must be provided.');
        }

        if (!password || !password.trim()) {
            throw new Error('A password must be provided.');
        }

        let signInData;
        try {
            const signInRes = await requestp({
                url: 'https://plex.tv/users/sign_in.json',
                method: 'POST',
                headers: Object.assign({
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept': 'application/json'
                }, this._commonHeaders),
                body: `user[login]=${username}&user[password]=${password}`
            });
            signInData = JSON.parse(signInRes.body);
        }
        catch (e) {
            throw new Error('Login failed. Please check your login details.');
        }

        try {
            const common = Object.keys(this._commonHeaders).map(k => `${k}=${this._commonHeaders[k]}`).join('&');
            const serverRes = await requestp(`https://plex.tv/api/resources?includeHttps=1&includeRelay=1&${common}&X-Plex-Token=${signInData.user.authentication_token}`);
            const serversData = await xmlp(serverRes.body);

            const servers = serversData.MediaContainer.Device.map(d => d['$'].name);
            if (!servers.indexOf(config.get('plexservername')) >= 0) {
                throw new Error('Server name does not exist');
            }
            signInData.resources = servers;
        }
        catch (e) {
            throw new Error('User does not have access to server.');
        }

        return signInData;
    }
}

export default PlexApi = new PlexApi();
