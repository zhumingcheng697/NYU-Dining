const fetch = require("node-fetch");

const locationJsonUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.json";
const locationXmlUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.xml";

/**
 * Makes the console logs colorful.
 *
 * @link https://stackoverflow.com/a/40560590
 * @type {Object}
 */
const logStyle = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m"
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        crimson: "\x1b[48m"
    }
};

fetch(locationJsonUrl)
    .then(res => res.json())
    .then(json => {
        console.log(json);
    }).catch(() => {
        console.error(`${logStyle.fg.red}Location JSON load failed${logStyle.reset}`);
    });

fetch(locationXmlUrl)
    .then(res => res.text())
    .then(json => {
        console.log(json);
    }).catch(() => {
        console.error(`${logStyle.fg.red}Location XML load failed${logStyle.reset}`);
    });