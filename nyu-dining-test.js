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

                if (locationJson.length > 0) {
                    console.log(`${logStyle.fg.green}${locationJson.length} location${locationJson.length === 1 ? "" : "s"} found in Location JSON${logStyle.reset}`);
                    console.log(locationJson)
                    fetchLocationXml();
                } else {
                    console.error(`${logStyle.fg.red}No locations found in Location JSON${logStyle.reset}`);
                }
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
                    console.log(`${logStyle.fg.green}Location XML parse succeeded${logStyle.reset}`);
                    try {
                        locationXml = xml["locations"]["location"];

                        if (locationXml.length > 0) {
                            console.log(`${logStyle.fg.green}${locationXml.length} location${locationXml.length === 1 ? "" : "s"} found in Location XML${logStyle.reset}`);
                            console.log(locationXml)
                        } else {
                            console.error(`${logStyle.fg.red}No locations found in Location XML${logStyle.reset}`);
                        }
                    } catch (e) {
                        console.error(`${logStyle.fg.red}"Locations" field not found in Location XML${logStyle.reset}`);
                    }
                } else {
                    console.error(`${logStyle.fg.red}Location XML parse failed${logStyle.reset}`);
                }
            });
        }).catch(() => {
            console.error(`${logStyle.fg.red}Location XML load failed${logStyle.reset}`);
        });
}

fetchLocationJson();