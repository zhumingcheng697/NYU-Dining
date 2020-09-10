const fetch = require("node-fetch");
const parseXmlStr = require("xml2js").parseString;

const locationJsonUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.json";
const locationXmlUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.xml";

let locationJson;
let locationXml;

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

function fetchLocationJson() {
    fetch(locationJsonUrl)
        .then(res => {
            console.log(`${logStyle.fg.green}Location JSON load succeeded${logStyle.reset}`);
            return res.text();
        }).then(text => {
            try {
                locationJson = JSON.parse(text);
                console.log(`${logStyle.fg.green}Location JSON parse succeeded${logStyle.reset}`);
                fetchLocationXml();
            } catch (e) {
                console.error(`${logStyle.fg.red}Location JSON parse failed${logStyle.reset}`);
            }
        }).catch(() => {
            console.error(`${logStyle.fg.red}Location JSON load failed${logStyle.reset}`);
        });
}

function fetchLocationXml() {
    fetch(locationXmlUrl)
        .then(res => {
            console.log(`${logStyle.fg.green}Location XML load succeeded${logStyle.reset}`);
            return res.text();
        }).then(text => {
            parseXmlStr(text, (err, xml) => {
                if (xml) {
                    locationXml = xml;
                    console.log(`${logStyle.fg.green}Location XML parse succeeded${logStyle.reset}`);
                    // console.log(xml);
                } else {
                    console.error(`${logStyle.fg.red}Location XML parse failed${logStyle.reset}`);
                }
            });
        }).catch(() => {
            console.error(`${logStyle.fg.red}Location XML load failed${logStyle.reset}`);
        });
}

fetchLocationJson();