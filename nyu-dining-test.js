const readline = require('readline');
const fetchFile = require("node-fetch");
const nodemailer = require("nodemailer");
const parseXmlStr = require("xml2js").parseString;

const locationsJsonUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.json";
const locationsXmlUrl = "https://s3.amazonaws.com/mobile.nyu.edu/dining/locations.xml";

/**
 * Configures nodemailer to be able to send emails
 *
 * @link https://ourcodeworld.com/articles/read/264/how-to-send-an-email-gmail-outlook-and-zoho-using-nodemailer-in-node-js
 */
const transport = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "ae677f881a6c52",
        pass: "80d9ee8bff404c"
    }
    // host: "smtp-mail.outlook.com",
    // secureConnection: false,
    // port: 587,
    // tls: {
    //     ciphers:'SSLv3'
    // },
    // auth: {
    //     user: "nyu-dining-test@outlook.com",
    //     pass: "Dining*2020"
    // }
});

/**
 * Keeps track of the current state of the program.
 *
 * "": regular running mode;
 * "R": ready to rerun;
 * "E0": asking whether to never send emails again;
 * "E1": ready to receive user input for email address;
 * "E2": email address received and ready to confirm user inputted email address;
 * "E3": email address confirmed and asking whether to remember it;
 * "E4": asking whether to forget email address;
 * "E5": asking whether to auto send emails after each run;
 *
 * @type {string}
 */
let runMode = "";

/**
 * User’s remember-email configuration
 *
 * @type {{sendEmail: number, rememberEmail: number, rememberedEmail: string, autoSend: number}}
 */
let userConfig = {
    sendEmail: 0,
    rememberEmail: 0,
    rememberedEmail: "",
    autoSend: 0
};

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
 * @type {Object[]}
 */
let locationsJson = [];

/**
 * Object representation of locations parsed from locationsXmlUrl
 *
 * @see locationsXml
 * @type {Object[]}
 */
let locationsXml = [];

/**
 * An array of name of locations in locationsJson that passed all tests (validateLocation and fetchMenu)
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
        if (jsonIndex < locationsJson.length - 1) {
            setTimeout(() => {
                console.log("");
                validateLocation(jsonIndex + 1);
            }, 50);
        } else {
            // allTestsCompleted = true;
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
        console.log(`${logStyle.fg.green}The following ${passedLocations.length} of ${locationsJson.length} location${locationsJson.length === 1 ? "" : "s"} in "locations.json" passed all tests successfully${logStyle.reset}`);
        console.log(passedLocations.join(showNextStep ? ", " : "\n"));
    } else {
        console.error(`${logStyle.fg.red}No locations in "locations.json" passed all tests${logStyle.reset}`);
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

        if (userConfig.sendEmail === 1 && userConfig.rememberEmail === 1 && userConfig.rememberedEmail) {
            handleEmailAddressInput(userConfig.rememberedEmail);
            return;
        } else if (userConfig.sendEmail === 0) {
            runMode = "E1";
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
 * Decides whether to store the user inputted email address in typedInEmail, or returns back to normal mode
 *
 * @param line {string} Keyboard input
 * @see typedInEmail
 * @return {void}
 */
function handleEmailAddressInput(line) {
    if (!line) {
        runMode = "E0";
        if (userConfig.rememberEmail === -1) {
            runMode = "";
            typeKeyPrompt();
        } else {
            console.log(`${logStyle.fg.yellow}Type in "R" to remember not to send emails, or press enter to ask whether to send email again the next time by default`);
        }
    } else {
        let emailMatch = line.match(/[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?/g);

        if (emailMatch && emailMatch[0] === line) {
            typedInEmail = line;
            runMode = "E2";
            console.log(`${logStyle.fg.yellow}An email with a copy of the error messages will be sent to "${typedInEmail}". Continue? (y/n)${logStyle.reset}`);
        } else {
            console.error(`${logStyle.fg.red}Please type in a valid email address, or press enter to go back${logStyle.reset}`);
        }
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
        if (userConfig.rememberEmail === 0) {
            runMode = "E3";
            console.log(`${logStyle.fg.yellow}Type in "R" to remember this email address, type in "N" to never remember any email addresses, or press enter to not remember this email address and ask for an email address again the next time by default${logStyle.reset}`);
        } else {
            sendEmail(userConfig.rememberedEmail || typedInEmail);
        }
    } else if (line.toUpperCase() === "N") {
        if (userConfig.sendEmail === 1 && userConfig.rememberEmail === 1 && userConfig.rememberedEmail) {
            runMode = "E4";
            console.log(`${logStyle.fg.yellow}Do you want us to forget this email address? (y/n)${logStyle.reset}`);
        } else {
            runMode = "";
            console.log("");
            typeKeyPrompt();
        }
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid key. (y/n)${logStyle.reset}`);
    }
}

/**
 * Stores the user’s email-remember setting in userConfig
 *
 * @param line {string} Keyboard input
 * @see userConfig
 * @return {void}
 */
function handleEmailRemember(line) {
    if (runMode === "E0") {
        if (line.toUpperCase() === "R") {
            userConfig.sendEmail = -1;
            userConfig.autoSend = -1;
            console.log(`${logStyle.fg.white}Thank you, we will remember not to send emails!${logStyle.reset}`);
        }

        if (line) {
            console.log("");
        }

        runMode = "";
        typeKeyPrompt();
    } else if (runMode === "E3") {
        if (line.toUpperCase() === "R") {
            userConfig.sendEmail = 1;
            userConfig.rememberEmail = 1;
            userConfig.rememberedEmail = typedInEmail;
            console.log(`${logStyle.fg.white}Thank you, we will remember to email "${userConfig.rememberedEmail}" the next time!${logStyle.reset}`);

            if (userConfig.autoSend === 0) {
                runMode = "E5";
                console.log(`${logStyle.fg.yellow}Would you like to automatically receive an email after each run of the test? (y/n)${logStyle.reset}`);
                return;
            }
        } else if (line.toUpperCase() === "N") {
            userConfig.sendEmail = 0;
            userConfig.rememberEmail = -1;
            userConfig.rememberedEmail = "";
            userConfig.autoSend = -1;
            console.log(`${logStyle.fg.white}Thank you, we will not ask this again next time!${logStyle.reset}`);
        }

        if (line) {
            console.log("");
        }
        sendEmail(typedInEmail);
    } else if (runMode === "E4") {
        if (line.toUpperCase() === "Y") {
            console.log(`${logStyle.fg.white}Thank you, we have forgotten email "${userConfig.rememberedEmail}" now!${logStyle.reset}`);
            userConfig.sendEmail = 0;
            userConfig.rememberEmail = 0;
            userConfig.rememberedEmail = "";
            userConfig.autoSend = 0;
            runMode = "E1";
            console.log(`${logStyle.fg.yellow}If you would like to email yourself a copy of these error messages to another email address, type that in. Otherwise, press enter.${logStyle.reset}`);
        } else if (line.toUpperCase() === "N") {
            runMode = "";
            console.log("");
            typeKeyPrompt();
        } else {
            console.error(`${logStyle.fg.red}Please type in a valid key. (y/n)${logStyle.reset}`);
        }
    } else if (runMode === "E5") {
        if (line.toUpperCase() === "Y") {
            console.log(`${logStyle.fg.white}Thank you, we will remember to automatically email "${userConfig.rememberedEmail}" after each run of the test!${logStyle.reset}`);
            userConfig.autoSend = 1;
        } else if (line.toUpperCase() === "N") {
            console.log(`${logStyle.fg.white}Thank you, we will not ask this again next time!${logStyle.reset}`);
            userConfig.autoSend = -1;
        } else {
            console.error(`${logStyle.fg.red}Please type in a valid key. (y/n)${logStyle.reset}`);
            return;
        }

        console.log("");
        sendEmail(userConfig.rememberedEmail);
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
        console.log("");
        rerunTest();
    } else if (line.toUpperCase() === "N") {
        runMode = "";
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
    console.log(`${logStyle.fg.yellow}Type "E" to see all error messages thrown in the last run${userConfig.sendEmail === -1 ? "" : ` and${userConfig.sendEmail === 1 && userConfig.rememberEmail === 1 && userConfig.rememberedEmail ? " " : " optionally "}email yourself a copy of it`}${logStyle.reset}`);
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
    locationsJson = [];
    locationsXml = [];
    passedLocations = [];
    noMenuLocations = [];
    noXmlMatchLocations = [];
    allErrorMsg = [];
    allTestsCompleted = false;
    runMode = "";
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

    console.log(`${logStyle.fg.white}------Emailing error messages to "${typedInEmail}"------${logStyle.reset}`);

    transport.sendMail(composeMessage(receiver))
        .then(() => {
            console.log(`${logStyle.fg.green}Email send succeeded${logStyle.reset}`);
        }).catch((e) => {
            console.log(`${logStyle.fg.red}Email send failed: ${e}${logStyle.reset}`);
        }).finally(() => {
            console.log("");
            finalHandler();
            typeKeyPrompt();
            runMode = "";
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
     * Show typeKeyPrompt with a timeout with or without a blank line
     *
     * @see typeKeyPrompt
     * @return {void}
     */
    function showPromptWithTimeout() {
        if (logBlankLine) {
            console.log("");
        }

        allTestsCompleted = true;

        setTimeout(() => {
            typeKeyPrompt();
        }, 50);
    }

    if (userConfig.autoSend === 1 && userConfig.sendEmail === 1 && userConfig.rememberEmail === 1 && userConfig.rememberedEmail && allErrorMsg.length > 0) {
        sendEmail(userConfig.rememberedEmail, () => {
            allTestsCompleted = true;
        });
    } else {
        showPromptWithTimeout();
    }
}

fetchLocationsJson();

/**
 * Handles keyboard input in the console.
 */
rl.on('line', (line) => {
    if (!allTestsCompleted) {
        return;
    }

    if (runMode === "") {
        if (line.toUpperCase() === "E") {
            errorMsgReport();
            return;
        } else if (line.toUpperCase() === "P") {
            passedLocationsReport();
        } else if (line.toUpperCase() === "M") {
            noMenuLocationsReport();
        } else if (line.toUpperCase() === "X") {
            noXmlMatchLocationsReport();
        } else if (line.toUpperCase() === "T") {
            locationsResultReport();
        } else if (line.toUpperCase() === "R") {
            runMode = "R";
            console.warn(`${logStyle.fg.red}Will rerun all tests. Continue? (y/n)${logStyle.reset}`)
            return;
        } else {
            console.error(`${logStyle.fg.red}Please type in a valid key. (E/P/M/X/T/R)${logStyle.reset}`);
            return;
        }

        setTimeout(() => {
            console.log("");
            typeKeyPrompt();
        }, 50);
    } else if (runMode === "R") {
        confirmRerun(line);
    } else if (runMode === "E1") {
        handleEmailAddressInput(line);
    } else if (runMode === "E2") {
        confirmSendEmail(line);
    } else if (["E0", "E3", "E4", "E5"].includes(runMode)) {
        handleEmailRemember(line);
    }
});