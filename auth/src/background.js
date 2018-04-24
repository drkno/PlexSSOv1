const request = require('request');
const util = require('util');
const config = require('config');
const fs = require('fs');
const path = require('path');

const requestp = util.promisify(request);
const statp = util.promisify(fs.stat);
const mkdirp = util.promisify(fs.mkdir);
const readFilep = util.promisify(fs.readFile);

const apiKey = config.get('fanarttvapikey');
const cacheDir = config.has('cachedir') ? config.get('cachedir') : `${process.cwd()}/cache`;

const backgrounds = {
    movies: [
        278,
        244786,
        680,
        155,
        13,
        1891,
        399106
    ],
    tv: [
        121361,
        74205,
        81189,
        79126,
        79349,
        275274
    ]
};
const randomArrayItem = array => array[Math.floor(Math.random() * array.length)];
const getBackgroundImage = async() => {
    const type = randomArrayItem(Object.keys(backgrounds));
    const id = randomArrayItem(backgrounds[type]);
    const res = await requestp(`http://webservice.fanart.tv/v3/${type}/${id}?api_key=${apiKey}`);
    const j = JSON.parse(res.body);
    let images = [];
    if (j.showbackground) {
        images = j.showbackground;
    }
    else if (j.moviebackground) {
        images = j.moviebackground;
    }
    else {
        return '';
    }

    const image = randomArrayItem(images);
    return {
        id: image.id,
        url: image.url
    };
};

const checkExists = async(p) => {
    try {
        const stat = await statp(p);
        if (stat.isDirectory()) {
            return 'directory';
        }
        if (stat.isFile()) {
            return 'file';
        }
        return 'other';
    }
    catch (e) {
        return false;
    }
};

const ensureDirExists = async(dir) => {
    if (!(await checkExists(dir))) {
        await mkdirp(dir);
    }
};

const downloadFile = (uri, loc, cb) => {
    request(uri).pipe(fs.createWriteStream(loc)).on('close', cb);
};

const downloadFilep = util.promisify(downloadFile);

module.exports = async(app) => {
    app.get('/api/v1/background', async(req, res) => {
        res.json({
            url: '/api/v2/backgroundProxy'
        });
    });

    app.get('/api/v2/backgroundProxy', async(req, res) => {
        try {
            const backgroundPromise = getBackgroundImage();
            await ensureDirExists(cacheDir);
            const background = await backgroundPromise;
            
            const cachePath = path.join(cacheDir, `${background.id}.jpg`);
            if (!(await checkExists(cachePath))) {
                await downloadFilep(background.url, cachePath);
            }
            res.sendFile(cachePath);
        }
        catch (e) {
            try {
                res.status(500);
            }
            catch (e2) {
                console.error(e2.stack);
                // client probably disconnected due to long wait
            }
        }
    });
};
