const fs = require('fs');
const he = require("he");
const readline = require('readline');
const nodeFetch = require("node-fetch");
const nodemailer = require("nodemailer");
const parseXmlStr = require("xml2js").parseString;
const HTMLParser = require('node-html-parser');

const locationsJsonUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.json";
const locationsXmlUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.xml";

/**
 * Configures nodemailer to be able to send emails
 *
 * @link https://ourcodeworld.com/articles/read/264/how-to-send-an-email-gmail-outlook-and-zoho-using-nodemailer-in-node-js
 */
const transport = nodemailer.createTransport({
    // host: "smtp.mailtrap.io",
    // port: 2525,
    // auth: {
    //     user: "ae677f881a6c52",
    //     pass: "80d9ee8bff404c"
    // }
    host: "smtp-mail.outlook.com",
    secureConnection: false,
    port: 587,
    tls: {
        ciphers:'SSLv3'
    },
    auth: {
        user: "nyu-dining-test@outlook.com",
        pass: "Dining*2020"
    }
});

/**
 * All available states of the program.
 *
 * @type {{configuring: number, standard: number, willRerun: number, willDisableEmail: number, willReceiveEmail: number, willConfirmEmail: number, willRememberEmail: number, willForgetEmail: number, willAutoSendEmails: number}}
 */
const RunMode = {
    configuring: 0,
    standard: 1,
    willRerun: 2,
    willDisableEmail: 3,
    willReceiveEmail: 4,
    willConfirmEmail: 5,
    willRememberEmail: 6,
    willForgetEmail: 7,
    willAutoSendEmails: 8
};

/**
 * Keeps track of the current state of the program.
 *
 * @type {number}
 */
let currentRunMode = RunMode.configuring;

/**
 * User’s remember-email configuration
 *
 * @type {{devMode: boolean, autoRunIntervalInMinute: number, autoSendEmailAfterRun: number, sendEmailAfterShowingErrors: number, rememberEmail: number, rememberedEmail: string}}
 */
let currentConfig = {
    devMode: false,
    autoRunIntervalInMinute: 0,
    autoSendEmailAfterRun: 0,
    sendEmailAfterShowingErrors: 0,
    rememberEmail: 0,
    rememberedEmail: ""
};

/**
 * Timeout id for auto rerun
 *
 * @type {number}
 */
let autoRerunId;

/**
 * The email address the user types in
 *
 * @type {string}
 */
let typedInEmail = "";

/**
 * Object representation of locations parsed from locationsJsonUrl
 *
 * @see locationsJsonUrl
 * @type {[Object]}
 */
let locationsJson = [];

/**
 * Object representation of locations parsed from locationsXmlUrl
 *
 * @see locationsXml
 * @type {[Object]}
 */
let locationsXml = [];

/**
 * An array of name of locations in locationsJson that passed all tests (validateLocation and fetchMenu)
 *
 * @see validateLocation
 * @see fetchMenu
 * @see locationsJson
 * @type {[string]}
 */
let passedLocations = [];

/**
 * An array of name of locations in locationsJson that passed validateLocation but failed fetchMenu
 *
 * @see validateLocation
 * @see fetchMenu
 * @see locationsJson
 * @type {[string]}
 */
let noMenuLocations = [];

/**
 * An array of name of locations in locationsJson that failed validateLocation
 *
 * @see validateLocation
 * @see locationsJson
 * @type {[string]}
 */
let noXmlMatchLocations = [];

/**
 * An array of thrown error messages in validateLocation and fetchMenu
 *
 * @see validateLocation
 * @see fetchMenu
 * @type {[string]}
 */
let allErrorMsg = [];

/**
 * Determines if all test runs are finished
 *
 * @type {boolean}
 */
let allTestsCompleted = false;

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
 * Tries to load currentConfig from local, or else initialize one with the default values
 *
 * @param handler {function} Runs after currentConfig load either succeeded or failed
 * @see currentConfig
 * @return {void}
 */
function loadOrInitConfig(handler = () => {}) {
    console.log(`${logStyle.fg.white}------Loading "config.json"------${logStyle.reset}`);

    fs.readFile("config.json", "utf-8", ((err, data) => {
        if (err) {
            console.error(`${logStyle.fg.red}File "config.json" not found${logStyle.reset}`);
        } else {
            try {
                const parsedConfig = JSON.parse(data);

                if (parsedConfig) {
                    const parsedDevMode = parsedConfig.devMode;
                    const parsedInterval = parsedConfig.autoRunIntervalInMinute;
                    const parsedAutoSend = parsedConfig.autoSendEmailAfterRun;
                    const parsedSendAfterShow = parsedConfig.sendEmailAfterShowingErrors;
                    const parsedRemember = parsedConfig.rememberEmail;
                    const parsedEmail = parsedConfig.rememberedEmail;

                    if (typeof parsedDevMode === "boolean" && typeof parsedInterval === "number" && [-1, 0, 1].includes(parsedAutoSend) && [-1, 0, 1].includes(parsedSendAfterShow) && [-1, 0, 1].includes(parsedRemember) && (parsedEmail === "" || validateEmail(parsedEmail))) {
                        currentConfig.devMode = parsedDevMode;
                        currentConfig.autoRunIntervalInMinute = parsedInterval;
                        currentConfig.autoSendEmailAfterRun = parsedAutoSend;
                        currentConfig.sendEmailAfterShowingErrors = parsedSendAfterShow;
                        currentConfig.rememberEmail = parsedRemember;
                        currentConfig.rememberedEmail = parsedEmail;
                        console.log(`${logStyle.fg.green}Configuration load succeeded${logStyle.reset}`);
                        handler();
                        return;
                    }
                }

                console.log(`${logStyle.fg.red}Configuration load failed${logStyle.reset}`);
            } catch (e) {
                console.log(`${logStyle.fg.red}Configuration load failed${logStyle.reset}`);
            }
        }

        setTimeout(() => {
            console.log(`${logStyle.fg.white}------Saving default configuration------${logStyle.reset}`);
            saveConfig(handler);
        }, 50);
    }));
}

/**
 * Tries to save currentConfig to local
 *
 * @param handler {function} Runs after currentConfig save either succeeded or failed
 * @see currentConfig
 * @return {void}
 */
function saveConfig(handler = () => {}) {
    fs.writeFile("config.json", JSON.stringify(currentConfig, null, 2), err => {
        if (err) {
            console.error(`${logStyle.fg.red}Configuration save failed: ${err}${logStyle.reset}`);
            handler();
        } else {
            console.log(`${logStyle.fg.green}Configuration save succeeded${logStyle.reset}`);

            if (!currentConfig.devMode && currentRunMode === RunMode.standard) {
                console.log(`${logStyle.fg.yellow}Delete "config.json" to reset all preferences${logStyle.reset}`);
            }

            handler();
        }
    });
}

/**
 * Fetches, parses, and validates location data from locationsJsonUrl and stores the data in locationsJson
 *
 * @see locationsJsonUrl
 * @see locationsJson
 * @return {void}
 */
function fetchLocationsJson() {
    console.log(`${logStyle.fg.white}------Loading "locations.json"------${logStyle.reset}`);
    nodeFetch(locationsJsonUrl)
        .then(res => {
            console.log(`${logStyle.fg.green}"locations.json" load succeeded${logStyle.reset}`);
            return res.text();
        }).then(text => {
            try {
                locationsJson = JSON.parse(`${text}`);
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
                    logAndPush(`${logStyle.fg.red}Fatal Error: No locations found in "locations.json"${logStyle.reset}`, "e");
                    terminateTest();
                }
            } catch (e) {
                logAndPush(`${logStyle.fg.red}Fatal Error: "locations.json" parse failed${logStyle.reset}`, "e");
                terminateTest();
            }
        }).catch(() => {
            logAndPush(`${logStyle.fg.red}Fatal Error: "locations.json" load failed${logStyle.reset}`, "e");
            terminateTest();
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
    nodeFetch(locationsXmlUrl)
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
                            logAndPush(`${logStyle.fg.red}Fatal Error: No locations found in "locations.xml"${logStyle.reset}`, "e");
                            terminateTest();
                        }
                    } catch (e) {
                        logAndPush(`${logStyle.fg.red}Fatal Error: Field "locations" does not exist in "locations.xml"${logStyle.reset}`, "e");
                        terminateTest();
                    }
                } else {
                    logAndPush(`${logStyle.fg.red}Fatal Error: "locations.xml" parse failed${logStyle.reset}`, "e");
                    terminateTest();
                }
            });
        }).catch(() => {
            logAndPush(`${logStyle.fg.red}Fatal Error: "locations.xml" load failed${logStyle.reset}`, "e");
            terminateTest();
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
        setTimeout(() => {
            console.log("");

            if (jsonIndex < locationsJson.length - 1) {
                validateLocation(jsonIndex + 1);
            } else {
                console.log(`${logStyle.fg.white}------All tests completed------${logStyle.reset}`);
                passedLocationsReport(true);
            }
        }, 50);
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
    nodeFetch(url)
        .then(res => {
            console.log(`${logStyle.fg.green}Menu load succeeded ${location ? `for "${location}"` : `from "${url}"`}${logStyle.reset}`);
            return res.text();
        }).then(text => {
            try {
                let menu = JSON.parse(`${text}`);
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
 * Logs names of locations in locationsJson that have passed all tests (validateLocation and fetchMenu)
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
        console.log(`${logStyle.fg.green}The following ${passedLocations.length} of ${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} in "locations.json" passed all tests successfully:${logStyle.reset}\n${passedLocations.join(showNextStep ? ", " : "\n")}`);
    } else {
        console.warn(`${logStyle.fg.red}No locations in "locations.json" passed all tests${logStyle.reset}`);
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
        console.log(`${logStyle.fg.red}The following ${noMenuLocations.length} of ${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} in "locations.json" ${noMenuLocations.length === 1 ? "has" : "have"} a match in "locations.xml" but had issue accessing menu${noMenuLocations.length === 1 ? "" : "s"}:${logStyle.reset}\n${noMenuLocations.join(showNextStep ? ", " : "\n")}`);
    } else {
        if (!showNextStep) {
            console.log(`${logStyle.fg.green}No locations in "locations.json" failed the menu test${logStyle.reset}`);
        }
    }

    if (showNextStep) {
        setTimeout(() => {
            if (noMenuLocations.length > 0) {
                console.log("");
            }

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
        console.log(`${logStyle.fg.red}The following ${noXmlMatchLocations.length} of ${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} in "locations.json" ${noXmlMatchLocations.length === 1 ? "does" : "do"} not have a match in "locations.xml":${logStyle.reset}\n${noXmlMatchLocations.join(showNextStep ? ", " : "\n")}`);
    } else {
        if (!showNextStep) {
            console.log(`${logStyle.fg.green}No locations in "locations.json" failed the XML test${logStyle.reset}`);
        }
    }

    if (showNextStep) {
        autoSendEmailOrShowPrompt(noXmlMatchLocations.length > 0);
    }
}

/**
 * Shows a table of all locations in locationsJson with their names and test results
 *
 * @see locationsJson
 * @return {void}
 */
function locationsResultReport() {
    if (locationsJson.length === 0) {
        console.error(`${logStyle.fg.red}No locations loaded from "locations.json"${logStyle.reset}`);
        return;
    }

    console.table(locationsJson.map(loc => {
        return {
            location: loc.name,
            result: (noXmlMatchLocations.includes(loc.name) ? "* XML Error *" : (noMenuLocations.includes(loc.name) ? "* Menu Error *" : (passedLocations.includes(loc.name) ? "PASSED" : "* Other Error *")))
        };
    }));
}

/**
 * Shows all previously thrown error messages
 *
 * @see locationsJson
 * @return {void}
 */
function errorMsgReport() {
    if (allErrorMsg.length >= 1) {
        console.log(allErrorMsg.join("\n"));
        console.log("");

        if (currentConfig.sendEmailAfterShowingErrors === 1 && validateEmail(currentConfig.rememberedEmail)) {
            handleEmailAddressInput(currentConfig.rememberedEmail);
            return;
        } else if (currentConfig.sendEmailAfterShowingErrors !== -1) {
            currentRunMode = RunMode.willReceiveEmail;
            console.log(`${logStyle.fg.yellow}If you would like to email yourself a copy of these error messages, type in your email address. Otherwise, press enter.${logStyle.reset}`);
            return;
        }
    } else {
        console.log(`${logStyle.fg.green}No error messages were thrown in the last run${logStyle.reset}`);
        console.log("");
    }

    typeKeyPrompt();
}

/**
 * Validates if an email address is valid
 *
 * @param email {string} Email address to validate
 * @return {boolean}
 */
function validateEmail(email) {
    let emailMatch = email.match(/[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?/g);
    return (emailMatch && emailMatch[0] === email);
}

/**
 * Decides whether to store the user inputted email address in typedInEmail, or returns back to normal mode
 *
 * @param line {string} Keyboard input
 * @see typedInEmail
 * @return {void}
 */
function handleEmailAddressInput(line) {
    if (!line) {
        if (currentConfig.devMode || currentConfig.rememberEmail === -1 || currentConfig.sendEmailAfterShowingErrors === 1) {
            currentRunMode = RunMode.standard;
            typeKeyPrompt();
        } else {
            currentRunMode = RunMode.willDisableEmail;
            console.log(`${logStyle.fg.yellow}Type in "N" to never ask to send emails again, or press enter to always ask whether to send an email by default`);
        }
    } else if (validateEmail(line)) {
        typedInEmail = line;
        currentRunMode = RunMode.willConfirmEmail;
        console.log(`${logStyle.fg.yellow}An email with a copy of the error messages will be sent to "${typedInEmail}". Continue? (y/n)${logStyle.reset}`);
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid email address, or press enter to go back${logStyle.reset}`);
    }
}

/**
 * Confirms whether to send email
 *
 * @param line {string} Keyboard input
 * @see sendEmail
 * @return {void}
 */
function confirmSendEmail(line) {
    if (line.toUpperCase() === "Y") {
        if (!currentConfig.devMode && currentConfig.rememberEmail === 0) {
            currentRunMode = RunMode.willRememberEmail;
            console.log(`${logStyle.fg.yellow}Type in "R" to remember this email address, type in "N" to never remember any email addresses, or press enter to not remember this email address and ask for an email address again the next time by default${logStyle.reset}`);
        } else {
            if (currentConfig.devMode && currentConfig.rememberEmail === 1) {
                currentConfig.rememberedEmail = typedInEmail;
                saveConfig(() => {
                    sendEmail(typedInEmail);
                });
                return;
            }

            sendEmail(typedInEmail);
        }
    } else if (line.toUpperCase() === "N") {
        if (!currentConfig.devMode && currentConfig.sendEmailAfterShowingErrors === 1 && validateEmail(currentConfig.rememberedEmail)) {
            currentRunMode = RunMode.willForgetEmail;
            console.log(`${logStyle.fg.yellow}Do you want us to forget this email address? (y/n)${logStyle.reset}`);
        } else {
            currentRunMode = RunMode.standard;
            console.log("");
            typeKeyPrompt();
        }
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid key. (y/n)${logStyle.reset}`);
    }
}

/**
 * Stores the user’s email-remember setting in currentConfig
 *
 * @param line {string} Keyboard input
 * @see currentConfig
 * @return {void}
 */
function handleEmailRemember(line) {
    switch (currentRunMode) {
        case RunMode.willDisableEmail:
            if (line.toUpperCase() === "N") {
                currentConfig.autoSendEmailAfterRun = -1;
                currentConfig.sendEmailAfterShowingErrors = -1;
                console.log(`${logStyle.fg.white}Thank you, we will remember not to send emails!${logStyle.reset}`);
            } else {
                currentConfig.autoSendEmailAfterRun = 0;
                currentConfig.sendEmailAfterShowingErrors = 1;
                console.log(`${logStyle.fg.white}Thank you, we will not ask this again next time!${logStyle.reset}`);
            }

            saveConfig(() => {
                console.log("");
                currentRunMode = RunMode.standard;
                typeKeyPrompt();
            });

            break;

        case RunMode.willRememberEmail:
            if (line.toUpperCase() === "R") {
                currentConfig.sendEmailAfterShowingErrors = 1;
                currentConfig.rememberEmail = 1;
                currentConfig.rememberedEmail = typedInEmail;
                console.log(`${logStyle.fg.white}Thank you, we will remember to email "${currentConfig.rememberedEmail}" the next time!${logStyle.reset}`);

                if (currentConfig.autoSendEmailAfterRun === 0) {
                    currentRunMode = RunMode.willAutoSendEmails;
                    console.log(`${logStyle.fg.yellow}Would you like to automatically receive an email after each run of the test? (y/n)${logStyle.reset}`);
                    return;
                }
            } else if (line.toUpperCase() === "N") {
                currentConfig.autoSendEmailAfterRun = -1;
                currentConfig.sendEmailAfterShowingErrors = 0;
                currentConfig.rememberEmail = -1;
                currentConfig.rememberedEmail = "";
                console.log(`${logStyle.fg.white}Thank you, we will not ask this again next time!${logStyle.reset}`);
            } else {
                if (line) {
                    console.log("");
                }

                sendEmail(typedInEmail);
                return;
            }

            saveConfig(() => {
                sendEmail(typedInEmail);
            });

            break;

        case RunMode.willForgetEmail:
            if (line.toUpperCase() === "Y") {
                console.log(`${logStyle.fg.white}Thank you, we have forgotten email "${currentConfig.rememberedEmail}" now!${logStyle.reset}`);
                currentConfig.autoSendEmailAfterRun = 0;
                currentConfig.sendEmailAfterShowingErrors = 0;
                currentConfig.rememberEmail = 0;
                currentConfig.rememberedEmail = "";
                saveConfig(() => {
                    currentRunMode = RunMode.willReceiveEmail;
                    console.log(`${logStyle.fg.yellow}If you would like to email yourself a copy of these error messages to another email address, type that in. Otherwise, press enter.${logStyle.reset}`);
                });
            } else if (line.toUpperCase() === "N") {
                currentRunMode = RunMode.standard;
                console.log("");
                typeKeyPrompt();
            } else {
                console.error(`${logStyle.fg.red}Please type in a valid key. (y/n)${logStyle.reset}`);
            }

            break;

        case RunMode.willAutoSendEmails:
            if (line.toUpperCase() === "Y") {
                console.log(`${logStyle.fg.white}Thank you, we will remember to automatically email "${currentConfig.rememberedEmail}" after each run of the test!${logStyle.reset}`);
                currentConfig.autoSendEmailAfterRun = 1;
            } else if (line.toUpperCase() === "N") {
                console.log(`${logStyle.fg.white}Thank you, we will not ask this again next time!${logStyle.reset}`);
                currentConfig.autoSendEmailAfterRun = -1;
            } else {
                console.error(`${logStyle.fg.red}Please type in a valid key. (y/n)${logStyle.reset}`);
                return;
            }

            saveConfig(() => {
                sendEmail(currentConfig.rememberedEmail);
            });

            break;
    }
}

/**
 * Confirms whether to rerun all tests
 *
 * @param line {string} Keyboard input
 * @see rerunTest
 * @return {void}
 */
function confirmRerun(line) {
    if (line.toUpperCase() === "Y") {
        rerunTest();
    } else if (line.toUpperCase() === "N") {
        currentRunMode = RunMode.standard;
        console.log("");
        typeKeyPrompt();
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid key. (y/n)${logStyle.reset}`);
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
    console.log(`${logStyle.fg.yellow}Type "E" to see all error messages thrown in the last run${currentConfig.sendEmailAfterShowingErrors === -1 ? "" : ` and${currentConfig.sendEmailAfterShowingErrors === 1 && validateEmail(currentConfig.rememberedEmail) ? " " : " optionally "}email yourself a copy of it`}${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "P" to see a list of the locations that passed all tests${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "M" to see a list of the locations that failed the menu test (had issue accessing menus)${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "X" to see a list of the locations that failed the XML test (does not have a match in XML)${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "T" to see a table of all locations with their names and test results${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type "R" to rerun the tests on all locations again${logStyle.reset}`);
}

/**
 * Terminates the test if fatal error is found
 *
 * @return {void}
 */
function terminateTest() {
    setTimeout(() => {
        // allTestsCompleted = true;
        console.log(`${logStyle.fg.white}------Test terminated------${logStyle.reset}`);
        autoSendEmailOrShowPrompt(false);
    }, 50);
}

/**
 * Resets the program and reruns all the tests
 *
 * @return {void}
 */
function rerunTest() {
    clearTimeout(autoRerunId);
    locationsJson = [];
    locationsXml = [];
    passedLocations = [];
    noMenuLocations = [];
    noXmlMatchLocations = [];
    allErrorMsg = [];
    allTestsCompleted = false;
    currentRunMode = RunMode.standard;
    console.log("");
    fetchLocationsJson();
}

/**
 * Sends a new email composed by composeMessage
 *
 * @param receiver {string} Email address to send the email to
 * @param finalHandler {function} Handler after sending the email
 * @see composeMessage
 * @return {void}
 */
function sendEmail(receiver, finalHandler = () => {}) {
    /**
     * Composes new email message for sendEmail to send
     *
     * @param receiver {string} Email address to send the email to
     * @see sendEmail
     * @return {Object}
     */
    function composeMessage(receiver) {
        return {
            from: "nyu-dining-test@outlook.com",
            to: receiver,
            subject: `NYU Dining Testing Error Report (${(new Date()).toLocaleString(undefined, {
                month: "short", day: "numeric", hour: "numeric", minute: "numeric", timeZoneName: "short"
            })})`,
            html: `<!DOCTYPE html><html lang="en"><body><header><h2>The following error${allErrorMsg.length === 1 ? " was" : "s were"} thrown during the last run of the test:</h2></header>${allErrorMsg.map(msg => {
                let temp = msg.replace(logStyle.fg.red, "<p style='color: red; font-weight: bold'>").replace(logStyle.reset, "</p>");

                if (!temp.startsWith("<p")) {
                    temp = "<p>" + temp;
                }

                if (!temp.endsWith("/p>")) {
                    temp = temp + "</p>";
                }

                return temp;
            }).join("")}</body></html>`
        };
    }

    console.log(`${logStyle.fg.white}------Emailing error messages to "${receiver}"------${logStyle.reset}`);

    transport.sendMail(composeMessage(receiver))
        .then(() => {
            console.log(`${logStyle.fg.green}Email send succeeded${logStyle.reset}`);
        }).catch((e) => {
            console.log(`${logStyle.fg.red}Email send failed: ${e}${logStyle.reset}`);
        }).finally(() => {
            finalHandler();
            console.log("");
            typeKeyPrompt();
            currentRunMode = RunMode.standard;
        });
}

/**
 * Decides whether to automatically send an email or show typeKeyPrompt
 *
 * @param logBlankLine {boolean} Whether to log a blank line before showing typeKeyPrompt
 * @see typeKeyPrompt
 * @return {void}
 */
function autoSendEmailOrShowPrompt(logBlankLine) {
    /**
     * Schedules automatic rerun
     *
     * @see rerunTest
     * @return {void}
     */
    function scheduleAutoRerun() {
        if (currentConfig.devMode && currentConfig.autoRunIntervalInMinute > 0) {
            console.log(`${logStyle.fg.white}------Automatically rerunning in ${currentConfig.autoRunIntervalInMinute} minute${currentConfig.autoRunIntervalInMinute === 1 ? "" : "s"}------${logStyle.reset}`);
            autoRerunId = setTimeout(rerunTest, currentConfig.autoRunIntervalInMinute * 60000);
        }
    }

    /**
     * Show typeKeyPrompt with a timeout with or without a blank line
     *
     * @see typeKeyPrompt
     * @return {void}
     */
    function showPromptWithTimeout() {
        scheduleAutoRerun();

        if (logBlankLine) {
            console.log("");
        }

        allTestsCompleted = true;

        setTimeout(() => {
            typeKeyPrompt();
        }, 50);
    }

    if (currentConfig.autoSendEmailAfterRun === 1 && validateEmail(currentConfig.rememberedEmail) && allErrorMsg.length > 0) {
        sendEmail(currentConfig.rememberedEmail, () => {
            allTestsCompleted = true;
            scheduleAutoRerun();
        });
    } else {
        showPromptWithTimeout();
    }
}

function fetchFromSites() {
    nodeFetch("https://mobile.nyu.edu/default/dining_nyu_eats_locations_and_menus/index")
        .then(res => {
            console.log(res.status);
            console.log(res.statusText);
            return res.text();
        }).then(text => {
            try {
                const el = HTMLParser.parse(`${text}`).querySelectorAll(`#kgoui_Rcontent_I1_Rcontent_I1_Ritems li a div.kgoui_list_item_textblock span`);
                console.log(el.map(e => he.decode(e.childNodes[0].rawText)));
            } catch (e) {
                console.warn(e);
            }
        }).catch((e) => {
            console.warn(e);
        });

    nodeFetch("https://nyu-test.modolabs.net/default/chartwells_dining/index")
        .then(res => {
            console.log(res.status);
            console.log(res.statusText);
            return res.text();
        }).then(text => {
            try {
                const el = HTMLParser.parse(`${text}`).querySelectorAll(`#kgoui_Rcontent_I1_Rcontent_I1_Ritems li a div.kgoui_list_item_textblock span`);
                console.log(el.map(e => he.decode(e.childNodes[0].rawText)));
            } catch (e) {
                console.warn(e);
            }
        }).catch((e) => {
            console.warn(e);
        });
}

/**
 * Self-invoking main function
 *
 * @return {void}
 */
(function main() {
    loadOrInitConfig(() => {
        currentRunMode = RunMode.standard;
        fetchLocationsJson();
    });

    /**
     * Handles keyboard input in the console.
     */
    rl.on('line', (line) => {
        if (!allTestsCompleted) {
            return;
        }

        switch (currentRunMode) {
            case RunMode.standard:
                switch (line.toUpperCase()) {
                    case "E":
                        errorMsgReport();
                        return;
                    case "P":
                        passedLocationsReport();
                        break;
                    case "M":
                        noMenuLocationsReport();
                        break;
                    case "X":
                        noXmlMatchLocationsReport();
                        break;
                    case "T":
                        locationsResultReport();
                        break;
                    case "R":
                        currentRunMode = RunMode.willRerun;
                        console.warn(`${logStyle.fg.red}Will rerun all tests. Continue? (y/n)${logStyle.reset}`)
                        return;
                    default:
                        console.error(`${logStyle.fg.red}Please type in a valid key. (E/P/M/X/T/R)${logStyle.reset}`);
                        return;
                }

                setTimeout(() => {
                    console.log("");
                    typeKeyPrompt();
                }, 50);

                break;

            case RunMode.willRerun:
                confirmRerun(line);
                break;

            case RunMode.willReceiveEmail:
                handleEmailAddressInput(line);
                break;

            case RunMode.willConfirmEmail:
                confirmSendEmail(line);
                break;

            default:
                handleEmailRemember(line);
        }
    });
})();