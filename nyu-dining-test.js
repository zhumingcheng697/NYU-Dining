const fetchFile = require("node-fetch");
const parseXmlStr = require("xml2js").parseString;

const locationsJsonUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.json";
const locationsXmlUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.xml";

/**
 * Object representation of locations parsed from locationsJsonUrl
 *
 * @see locationsJsonUrl
 * @type {Object[]}
 */
let locationsJson;

/**
 * Object representation of locations parsed from locationsXmlUrl
 *
 * @see locationsXml
 * @type {Object[]}
 */
let locationsXml;

/**
 * An array of name of locations in locationsJson that passed ALL tests (validateLocation and fetchMenu)
 *
 * @see validateLocation
 * @see fetchMenu
 * @see locationsJson
 * @type {string[]}
 */
let passedLocations = [];

/**
 * An array of name of locations in locationsJson that passed validateLocation but failed fetchMenu
 *
 * @see validateLocation
 * @see fetchMenu
 * @see locationsJson
 * @see locationsXml
 * @type {string[]}
 */
let menuIssueLocations = [];

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

/**
 * Fetches, parses, and validates location data from locationsJsonUrl and stores the data in locationsJson
 *
 * @see locationsJsonUrl
 * @see locationsJson
 * @return {void}
 */
function fetchLocationsJson() {
    console.log(`${logStyle.fg.white}------Loading "locations.json"------${logStyle.reset}`);
    fetchFile(locationsJsonUrl)
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

/**
 * Fetches, parses, and validates location data from locationsXmlUrl and stores the data in locationsXml
 *
 * @see locationsXmlUrl
 * @see locationsXml
 * @return {void}
 */
function fetchLocationsXml() {
    console.log(`${logStyle.fg.white}------Loading "locations.xml"------${logStyle.reset}`);
    fetchFile(locationsXmlUrl)
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
                            validateLocation();
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

/**
 * Validates location data in locationsJson and locationsXml
 *
 * @param jsonIndex {number} Index of location to validate in locationsJson
 * @see locationsJson
 * @see locationsXml
 * @return {void}
 */
function validateLocation(jsonIndex = 0) {
    /**
     * Runs validateLocation on the next location in locationsJson, if there is one, or console log the testing report
     *
     * @see validateLocation
     * @see locationsJson
     * @return {void}
     */
    function validateNext() {
        if (jsonIndex < locationsJson.length - 1) {
            setTimeout(() => {
                console.log("")
                validateLocation(jsonIndex + 1);
            }, 50);
        } else {
            console.log("");
            console.log(`${logStyle.fg.white}------All tests completed------${logStyle.reset}`);
            validationReport();
        }
    }

    try {
        const loc = locationsJson[jsonIndex];
        console.log(`${logStyle.fg.white}Checking "${loc.name}" in "locations.json" (${jsonIndex + 1}/${locationsJson.length})${logStyle.reset}`);
        if (typeof loc["open"] === "undefined") {
            console.error(`${logStyle.fg.red}Field "open" does not exist for "${loc.name}"${logStyle.reset}`);
        } else {
            const isOpen = loc["open"];
            if (loc.schedules === -1) {
                console.log(`${isOpen ? logStyle.fg.red : ""}"${loc.name}" is ${isOpen ? `open but` : `closed and`} field "schedules" does not exist${logStyle.reset}`);
            } else if (loc.schedules === 0) {
                console.log(`${isOpen ? logStyle.fg.red : ""}"${loc.name}" is ${isOpen ? `open but` : `closed and`} has no schedules${logStyle.reset}`);
            } else {
                console.log(`${isOpen ? logStyle.fg.green : ""}"${loc.name}" is ${isOpen ? `open` : `closed`} and has ${loc.schedules} schedule${loc.schedules === 1 ? "" : "s"}${logStyle.reset}`);
            }
        }

        try {
            const matchInXml = locationsXml.find(locXml => {
                return locXml.id === loc.id && (locXml.name === loc.name || locXml.mapName === loc.name);
            });

            console.log(`${loc["open"] && loc.schedules >= 1 ? (matchInXml ? logStyle.fg.green : logStyle.fg.red) : ""}"${loc.name}" is${matchInXml ? " " : " not "}found in "locations.xml"${logStyle.reset}`);

            if (matchInXml) {
                const menuUrl = matchInXml.menuURL;
                console.log(`${menuUrl ? logStyle.fg.green : logStyle.fg.red}Menu URL is${menuUrl ? " " : " not "}found for "${loc.name}" in "locations.xml"${logStyle.reset}`);
                if (menuUrl) {
                    const isIdMatch = menuUrl.endsWith(`${matchInXml.id}.json`);
                    console.log(`${isIdMatch ? logStyle.fg.green : logStyle.fg.red}Menu URL ${isIdMatch ? "matches" : `"${menuUrl}" does not match`} location id${isIdMatch ? " " : ` "${matchInXml.id}" `}for "${loc.name}"${logStyle.reset}`);
                    fetchMenu(menuUrl, loc.name, validateNext);
                }
            } else {
                validateNext();
            }
        } catch (e) {
            console.error(`${logStyle.fg.red}Something went wrong when trying to access "${loc.name}" in "locations.xml"${logStyle.reset}`);
            validateNext();
        }
    } catch (e) {
        console.error(`${logStyle.fg.red}Something went wrong with location ${jsonIndex} in "locations.json"${logStyle.reset}`);
        validateNext();
    }
}

/**
 * Fetches, parses, and validates menu data from the given URL for a location
 *
 * @param url {string} URL of menu JSON file to fetch, parse, and validate
 * @param location {string} Name of the location to fetch menu for
 * @param completion {function} Completion handler
 * @return {void}
 */
function fetchMenu(url, location, completion = () => {}) {
    fetchFile(url)
        .then(res => {
            console.log(`${logStyle.fg.green}Menu load succeeded ${location ? `for "${location}"` : `from "${url}"`}${logStyle.reset}`);
            return res.text();
        }).then(text => {
            try {
                let menu = JSON.parse(text);
                console.log(`${logStyle.fg.green}Menu parse succeeded ${location ? `for "${location}"` : `from "${url}"`}${logStyle.reset}`);
                menu["menus"] = (typeof menu["menus"] === "undefined" ? -1 : menu["menus"].length);

                if (menu.menus === -1) {
                    console.error(`${logStyle.fg.red}Field "menus" does not exist ${location ? `for "${location}"` : `at "${url}"`}${logStyle.reset}`);
                    menuIssueLocations.push(location);
                } else if (menu.menus === 0) {
                    console.error(`${logStyle.fg.red}No menus found ${location ? `for "${location}"` : `at "${url}"`}${logStyle.reset}`);
                    menuIssueLocations.push(location);
                } else {
                    console.log(`${logStyle.fg.green}${menu.menus} menu${menu.menus === 1 ? "" : "s"} found ${location ? `for "${location}"` : `at "${url}"`}${logStyle.reset}`);
                    passedLocations.push(location);
                }
                completion();
            } catch (e) {
                console.error(`${logStyle.fg.red}Menu parse failed ${location ? `for "${location}"` : `from "${url}"`}${logStyle.reset}`);
                menuIssueLocations.push(location);
                completion();
            }
        }).catch(() => {
            console.error(`${logStyle.fg.red}Menu load failed ${location ? `for "${location}"` : `from "${url}"`}${logStyle.reset}`);
            menuIssueLocations.push(location);
            completion();
        });
}

/**
 * Logs a comprehensive report for validateLocation and fetchMenu result for all locations in locationsJson
 *
 * @see validateLocation
 * @see fetchMenu
 * @see locationsJson
 * @return {void}
 */
function validationReport() {
    if (passedLocations.length > 0) {
        console.log(`${logStyle.fg.green}The following ${passedLocations.length} of ${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} in "locations.json" passed ALL tests successfully${logStyle.reset}`);
        console.log(passedLocations.join(", "));

        console.log("");

        if (menuIssueLocations.length > 0) {
            console.log(`${logStyle.fg.red}The following ${menuIssueLocations.length} of ${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} in "locations.json" ${menuIssueLocations.length === 1 ? "has" : "have"} a match in "locations.xml" but ran into issues when loading ${menuIssueLocations.length === 1 ? "its menu" : "their respective menus"}${logStyle.reset}`);
            console.log(menuIssueLocations.join(", "));
        }
    } else {
        console.error(`${logStyle.fg.red}All locations in "locations.json" failed some or all tests${logStyle.reset}`);
    }
}

fetchLocationsJson();