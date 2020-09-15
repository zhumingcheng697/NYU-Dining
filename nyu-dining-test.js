const readline = require('readline');
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
 * @type {string[]}
 */
let noMenuLocations = [];

/**
 * An array of name of locations in locationsJson that failed validateLocation
 *
 * @see validateLocation
 * @see locationsJson
 * @type {string[]}
 */
let noXmlMatchLocations = [];

/**
 * An array of thrown error messages in validateLocation and fetchMenu
 *
 * @see validateLocation
 * @see fetchMenu
 * @type {string[]}
 */
let allErrorMsg = [];

/**
 * Determines if all test runs are finished
 *
 * @type {boolean}
 */
let allTestsCompleted = false;

/**
 * Whether the user has chosen to rerun the program
 *
 * @type {boolean}
 */
let rerunChosen = false;

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
 * Reads the keyboard input from the console.
 *
 * @link http://logan.tw/posts/2015/12/12/read-lines-from-stdin-in-nodejs/
 */
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

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
                                    logAndPush(`${logStyle.fg.red}Field "eventsFeedConfig" does not exist for "${loc["name"]}" in "locations.xml"${logStyle.reset}`, "e");
                                }
                            });

                            console.log(`${logStyle.fg.green}${locationsXml.length} location${locationsXml.length === 1 ? "" : "s"} found in "locations.xml"${logStyle.reset}`);
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
                console.log("");
                validateLocation(jsonIndex + 1);
            }, 50);
        } else {
            allTestsCompleted = true;
            console.log("");
            console.log(`${logStyle.fg.white}------All tests completed------${logStyle.reset}`);
            passedLocationsReport(true);
        }
    }

    try {
        const loc = locationsJson[jsonIndex];
        console.log(`${logStyle.fg.white}Checking "${loc.name}" in "locations.json" (${jsonIndex + 1}/${locationsJson.length})${logStyle.reset}`);
        if (typeof loc["open"] === "undefined") {
            logAndPush(`${logStyle.fg.red}Field "open" does not exist for "${loc.name}"${logStyle.reset}`, "e");
        } else {
            const isOpen = loc["open"];
            if (loc.schedules === -1) {
                logAndPush(`${isOpen ? logStyle.fg.red : ""}"${loc.name}" is ${isOpen ? `open but` : `closed and`} field "schedules" does not exist${logStyle.reset}`, isOpen ? "e" : "w");
            } else if (loc.schedules === 0) {
                logAndPush(`${isOpen ? logStyle.fg.red : ""}"${loc.name}" is ${isOpen ? `open but` : `closed and`} has no schedules${logStyle.reset}`, isOpen ? "e" : "w");
            } else {
                logAndPush(`${isOpen ? logStyle.fg.green : ""}"${loc.name}" is ${isOpen ? `open` : `closed`} and has ${loc.schedules} schedule${loc.schedules === 1 ? "" : "s"}${logStyle.reset}`, isOpen ? "" : "w");
            }
        }

        setTimeout(() => {
            try {
                const matchInXml = locationsXml.find(locXml => {
                    return locXml.id === loc.id && (locXml.name === loc.name || locXml.mapName === loc.name);
                });

                logAndPush(`${loc["open"] && loc.schedules >= 1 ? (matchInXml ? logStyle.fg.green : logStyle.fg.red) : ""}"${loc.name}" is${matchInXml ? " " : " not "}found in "locations.xml"${logStyle.reset}`, loc["open"] && loc.schedules >= 1 ? (matchInXml ? "" : "e") : "w");

                if (matchInXml) {
                    const menuUrl = matchInXml.menuURL;
                    logAndPush(`${menuUrl ? logStyle.fg.green : logStyle.fg.red}Menu URL is${menuUrl ? " " : " not "}found for "${loc.name}" in "locations.xml"${logStyle.reset}`, menuUrl ? "" : "e");
                    if (menuUrl) {
                        const isIdMatch = menuUrl.endsWith(`${matchInXml.id}.json`);
                        logAndPush(`${isIdMatch ? logStyle.fg.green : logStyle.fg.red}Menu URL ${isIdMatch ? "matches" : `"${menuUrl}" does not match`} location id${isIdMatch ? " " : ` "${matchInXml.id}" `}for "${loc.name}"${logStyle.reset}`, isIdMatch ? "" : "w");
                        fetchMenu(menuUrl, loc.name, validateNext);
                    }
                } else {
                    noXmlMatchLocations.push(loc.name);
                    validateNext();
                }
            } catch (e) {
                logAndPush(`${logStyle.fg.red}Something went wrong when trying to access "${loc.name}" in "locations.xml"${logStyle.reset}`, "e");
                noXmlMatchLocations.push(loc.name);
                validateNext();
            }
        }, 50);
    } catch (e) {
        logAndPush(`${logStyle.fg.red}Something went wrong with location ${jsonIndex} in "locations.json"${logStyle.reset}`, "e");
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
                    logAndPush(`${logStyle.fg.red}Field "menus" does not exist ${location ? `for "${location}"` : `at "${url}"`}${logStyle.reset}`, "e");
                    noMenuLocations.push(location);
                } else if (menu.menus === 0) {
                    logAndPush(`${logStyle.fg.red}No menus found ${location ? `for "${location}"` : `at "${url}"`}${logStyle.reset}`, "e");
                    noMenuLocations.push(location);
                } else {
                    console.log(`${logStyle.fg.green}${menu.menus} menu${menu.menus === 1 ? "" : "s"} found ${location ? `for "${location}"` : `at "${url}"`}${logStyle.reset}`);
                    passedLocations.push(location);
                }
                completion();
            } catch (e) {
                logAndPush(`${logStyle.fg.red}Menu parse failed ${location ? `for "${location}"` : `from "${url}"`}${logStyle.reset}`, "e");
                noMenuLocations.push(location);
                completion();
            }
        }).catch(() => {
            logAndPush(`${logStyle.fg.red}Menu load failed ${location ? `for "${location}"` : `from "${url}"`}${logStyle.reset}`, "e");
            noMenuLocations.push(location);
            completion();
        });
}

/**
 * Logs names of locations in locationsJson that have passed ALL tests (validateLocation and fetchMenu)
 *
 * @param showNextStep {boolean} Whether to show noMenuLocationsReport automatically, default to false
 * @see noMenuLocationsReport
 * @see validateLocation
 * @see fetchMenu
 * @see locationsJson
 * @return {void}
 */
function passedLocationsReport(showNextStep = false) {
    if (passedLocations.length > 0) {
        console.log(`${logStyle.fg.green}The following ${passedLocations.length} of ${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} in "locations.json" passed ALL tests successfully${logStyle.reset}`);
        console.log(passedLocations.join(showNextStep ? ", " : "\n"));
    } else {
        console.error(`${logStyle.fg.red}All locations in "locations.json" failed some or all tests${logStyle.reset}`);
    }

    if (showNextStep) {
        console.log("");
        setTimeout(() => {
            noMenuLocationsReport(showNextStep);
        }, 50);
    }
}

/**
 * Logs name of locations in locationsJson that have passed validateLocation but failed fetchMenu
 *
 * @param showNextStep {boolean} Whether to show noXmlMatchLocationsReport automatically, default to false
 * @see noXmlMatchLocationsReport
 * @see validateLocation
 * @see fetchMenu
 * @see locationsJson
 * @return {void}
 */
function noMenuLocationsReport(showNextStep = false) {
    if (noMenuLocations.length > 0) {
        console.warn(`${logStyle.fg.red}The following ${noMenuLocations.length} of ${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} in "locations.json" ${noMenuLocations.length === 1 ? "has" : "have"} a match in "locations.xml" but had issue accessing menu${noMenuLocations.length === 1 ? "" : "s"}${logStyle.reset}`);
        console.log(noMenuLocations.join(showNextStep ? ", " : "\n"));

        if (showNextStep) {
            console.log("");
        }
    } else {
        if (!showNextStep) {
            console.log(`${logStyle.fg.green}No locations in "locations.json" failed the menu test${logStyle.reset}`);
        }
    }

    if (showNextStep) {
        setTimeout(() => {
            noXmlMatchLocationsReport(showNextStep);
        }, 50);
    }
}

/**
 * Logs names of locations in locationsJson that have failed validateLocation
 *
 * @param showNextStep {boolean} Whether to show the keyboard input prompt automatically, default to false
 * @see validateLocation
 * @see locationsJson
 * @return {void}
 */
function noXmlMatchLocationsReport(showNextStep = false) {
    if (noXmlMatchLocations.length > 0) {
        console.warn(`${logStyle.fg.red}The following ${noXmlMatchLocations.length} of ${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} in "locations.json" ${noXmlMatchLocations.length === 1 ? "does" : "do"} not have a match in "locations.xml"${logStyle.reset}`);
        console.log(noXmlMatchLocations.join(showNextStep ? ", " : "\n"));

        if (showNextStep) {
            console.log("");
        }
    } else {
        if (!showNextStep) {
            console.log(`${logStyle.fg.green}No locations in "locations.json" failed the XML test${logStyle.reset}`);
        }
    }

    if (showNextStep) {
        setTimeout(() => {
            typeKeyPrompt();
        }, 50);
    }
}

/**
 * Logs message in console and pushes it to allErrorMsg, if necessary
 *
 * @param msg {string} Message to log
 * @param logMethod {string} Method to log: log (by default), warn (w), or error (e)
 * @see allErrorMsg
 * @return {void}
 */
function logAndPush(msg, logMethod = "log") {
    if (logMethod === "e" || logMethod === "error") {
        console.error(msg);
    } else if (logMethod === "w" || logMethod === "warn") {
        console.warn(msg);
    } else {
        console.log(msg);
        return;
    }

    allErrorMsg.push(msg);
}

/**
 * Logs the instruction for keyboard input
 *
 * @return {void}
 */
function typeKeyPrompt() {
    console.log(`${logStyle.fg.yellow}Type "E" to see all error messages thrown in the previous run${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "P" to see a list of the locations that passed ALL tests${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "M" to see a list of the locations that failed the menu test (had issue accessing menus)${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "X" to see a list of the locations that failed the XML test (does not have a match in XML)${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "T" to see a table of all locations with their names and test results${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "R" to rerun the tests on all locations again${logStyle.reset}`);
}

/**
 * Shows a table of all locations in locationsJson with their names and test results
 *
 * @see locationsJson
 * @return {void}
 */
function locationsResultReport() {
    console.table(locationsJson.map(loc => {
        return {
            location: loc.name,
            result: (noXmlMatchLocations.includes(loc.name) ? "* XML Error *" : (noMenuLocations.includes(loc.name) ? "* Menu Error *" : (passedLocations.includes(loc.name) ? "PASSED" : "* Other Error *")))
        };
    }));
}

/**
 * Reset the program and reruns all the tests
 *
 * @return {void}
 */
function rerunAllTests() {
    locationsJson = null;
    locationsXml = null;
    passedLocations = [];
    noMenuLocations = [];
    noXmlMatchLocations = [];
    allErrorMsg = [];
    allTestsCompleted = false;
    rerunChosen = false;
    fetchLocationsJson();
}

fetchLocationsJson();

/**
 * Handles keyboard input in the console.
 */
rl.on('line', (line) => {
    if (!allTestsCompleted) {
        return;
    }

    if (!rerunChosen) {
        if (line.toUpperCase() === "E") {
            console.log(allErrorMsg.join("\n"));
        } else if (line.toUpperCase() === "P") {
            passedLocationsReport();
        } else if (line.toUpperCase() === "M") {
            noMenuLocationsReport();
        } else if (line.toUpperCase() === "X") {
            noXmlMatchLocationsReport();
        } else if (line.toUpperCase() === "T") {
            locationsResultReport();
        } else if (line.toUpperCase() === "R") {
            rerunChosen = true;
            console.warn(`${logStyle.fg.red}Will rerun all tests. Continue? (y/n)${logStyle.reset}`)
            return;
        } else {
            console.error(`${logStyle.fg.red}Please type in a valid key. (E/P/M/X/T/R)${logStyle.reset}`);
            return;
        }

        console.log("");
        typeKeyPrompt();
    } else {
        if (line.toUpperCase() === "Y") {
            console.log("");
            rerunAllTests();
        } else if (line.toUpperCase() === "N") {
            rerunChosen = false;
            console.log("");
            typeKeyPrompt();
        } else {
            console.error(`${logStyle.fg.red}Please type in a valid key. (y/n)${logStyle.reset}`);
        }
    }
});