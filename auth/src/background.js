const request = require('request');
const util = require('util');
const config = require('config');

const requestp = util.promisify(request);

const apiKey = config.get('fanarttvapikey');

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
    return image.url;
};

module.exports = getBackgroundImage;
