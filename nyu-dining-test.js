const fetch = require("node-fetch");
const parseXmlStr = require("xml2js").parseString;

const locationsJsonUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.json";
const locationsXmlUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.xml";

let locationsJson;
let locationsXml;

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

function fetchLocationsJson() {
    console.log(`${logStyle.fg.white}------Loading "locations.json"------${logStyle.reset}`);
    fetch(locationsJsonUrl)
        .then(res => {
            console.log(`${logStyle.fg.green}"locations.json" load succeeded${logStyle.reset}`);
            return res.text();
        }).then(text => {
            try {
                locationsJson = JSON.parse(text);
                locationsJson.forEach(loc => {
                    loc["schedules"] = typeof loc["schedules"] === "undefined" ? -1 : loc["schedules"].length;
                    delete loc["address"];
                    delete loc["type"];
                });

                console.log(`${logStyle.fg.green}"locations.json" parse succeeded${logStyle.reset}`);

                if (locationsJson.length > 0) {
                    console.log(`${logStyle.fg.green}${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} found in "locations.json"${logStyle.reset}`);
                    // console.log(locationsJson)
                    fetchLocationsXml();
                } else {
                    console.error(`${logStyle.fg.red}No locations found in "locations.json"${logStyle.reset}`);
                }
            } catch (e) {
                console.error(`${logStyle.fg.red}"locations.json" parse failed${logStyle.reset}`);
            }
        }).catch(() => {
            console.error(`${logStyle.fg.red}"locations.json" load failed${logStyle.reset}`);
        });
}

function fetchLocationsXml() {
    console.log(`${logStyle.fg.white}------Loading "locations.xml"------${logStyle.reset}`);
    fetch(locationsXmlUrl)
        .then(res => {
            console.log(`${logStyle.fg.green}"locations.xml" load succeeded${logStyle.reset}`);
            return res.text();
        }).then(text => {
            parseXmlStr(text, (err, xml) => {
                if (xml) {
                    console.log(`${logStyle.fg.green}"locations.xml" parse succeeded${logStyle.reset}`);
                    try {
                        locationsXml = xml["locations"]["location"];

                        if (locationsXml.length > 0) {
                            locationsXml.forEach(loc => {
                                try {
                                    loc["name"] = loc["name"][0];
                                    loc["mapName"] = loc["mapName"][0];

                                    if (loc.name === loc.mapName) {
                                        delete loc.mapName;
                                    } else {
                                        console.error(`${logStyle.fg.red}Location name "${loc.name}" is not the same as map name "${loc.mapName}" in "locations.xml"${logStyle.reset}`);
                                    }

                                    loc["id"] = loc["eventsFeedConfig"][0]["locationID"][0];
                                    loc["menuURL"] = loc["eventsFeedConfig"][0]["menuURL"][0];
                                    delete loc["eventsFeedConfig"];
                                } catch (e) {
                                    console.error(`${logStyle.fg.red}Field "eventsFeedConfig" does not exist for "${loc["name"]}" in "locations.xml"${logStyle.reset}`);
                                }
                            })

                            console.log(`${logStyle.fg.green}${locationsXml.length} location${locationsXml.length === 1 ? "" : "s"} found in "locations.xml"${logStyle.reset}`);
                            // console.log(locationsXml);
                            console.log("");
                            validateLocation(0);
                        } else {
                            console.error(`${logStyle.fg.red}No locations found in "locations.xml"${logStyle.reset}`);
                        }
                    } catch (e) {
                        console.error(`${logStyle.fg.red}Field "locations" does not exist in "locations.xml"${logStyle.reset}`);
                    }
                } else {
                    console.error(`${logStyle.fg.red}"locations.xml" parse failed${logStyle.reset}`);
                }
            });
        }).catch(() => {
            console.error(`${logStyle.fg.red}"locations.xml" load failed${logStyle.reset}`);
        });
}

function validateLocation(jsonIndex = 0) {
    try {
        let loc = locationsJson[jsonIndex];
        console.log(`${logStyle.fg.white}Checking "${loc.name}" in "locations.json" (${jsonIndex + 1}/${locationsJson.length})${logStyle.reset}`);
        if (typeof loc["open"] === "undefined") {
            console.error(`${logStyle.fg.red}Field "open" does not exist for "${loc.name}"${logStyle.reset}`);
            if (jsonIndex < locationsJson.length - 1) {
                validateLocation(jsonIndex + 1);
            }
        } else {
            let isOpen = loc["open"];
            if (loc.schedules === -1) {
                console.log(`${isOpen ? logStyle.fg.red : ""}"${loc.name}" is ${isOpen ? `open but` : `closed and`} field "schedules" does not exist${logStyle.reset}`);
            } else if (loc.schedules === 0) {
                console.log(`${isOpen ? logStyle.fg.red : ""}"${loc.name}" is ${isOpen ? `open but` : `closed and`} has no schedules${logStyle.reset}`);
            } else {
                console.log(`${isOpen ? logStyle.fg.green : ""}"${loc.name}" is ${isOpen ? `open` : `closed`} and has ${loc.schedules} schedule${loc.schedules === 1 ? "" : "s"}${logStyle.reset}`);
            }

            if (jsonIndex < locationsJson.length - 1) {
                console.log("")
                validateLocation(jsonIndex + 1);
            }
        }
    } catch (e) {
        console.error(`${logStyle.fg.red}Something went wrong with location ${jsonIndex} in "locations.json"${logStyle.reset}`);
    }
}

fetchLocationsJson();