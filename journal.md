# Journal

## Week 2

### Wednesday: September 9, 2020 (1 hour)

- Added ability to fetch JSON files from the web and parse it using [node-fetch](https://www.npmjs.com/package/node-fetch) module

### Thursday: September 10, 2020 (4 hours)

- Added ability to fetch XML files from the web and parse it using [xml2js](https://www.npmjs.com/package/xml2js) module

- Added ability to validate and extract needed location data and get rid of extra unnecessary data from the parsed JSON and XML

- Enhanced ability to handle exceptions when parsing JSON and XML and validating location data

- Added ability to validate each location in the parsed JSON and check its `open` status and presence and amount of `schedules`

### Friday: September 11, 2020 (5 hours)

- Added ability to check if locations from the parsed JSON also exist under the same `name` and `id` in the parsed XML

- Added ability to check if the `menuUrl` of a location in the parsed XML matches its `id`

- Added ability to fetch and parse JSON files from the `menuUrl` of each location in the parsed XML, and check the presence and amount of its `menus`

- Added ability to log locations from the parsed JSON that passed all the tests, those that have a match in the parsed XML but failed to load menus, and those that do not have a match in the parsed XML

- Added documentation to most functions and important variables

## Week 3

### Monday: September 14, 2020 (3 hours)

- Added ability to use custom functions to console log messages and push it to an error messages array if needed

- Added ability to show a table of location names and corresponding testing results

- Added ability to listen to keyboard inputs and display information accordingly

- Added ability to rerun all tests

### Tuesday: September 15, 2020 (2 hours)

- Partially fixed bugs where console logs show up out of order

- Fixed bugs where no locations failed on either the XML test or menu test

- Added `README.md`

### Wednesday: September 16, 2020 (5 hours)

- Added ability to terminate the test after fatal errors

- Set up an outlook [email account](mailto:nyu-dining-test@outlook.com)

- Added ability to send dummy and real emails using [nodemailer](https://www.npmjs.com/package/nodemailer) module

- Added ability to validate user inputted email address

- Added ability to map terminal color codes into styled `HTML` code to send in emails

- Added ability to remember (during the session) and forget whether the users prefer to email themselves error messages and which email address they prefer

### Thursday: September 17, 2020 (5 hours)

- Added ability to email error messages automatically after the test finishes

- Added ability to save user’s email configuration preferences to a JSON file and read from it

- Added `devMode` for maximum automation and minimal user input and interaction

- Added ability to automatically rerun the test after a set interval when running under `devMode`

- Updated `README.md`

## Week 4

### Monday: September 21, 2020 (3 hours)

- Updated `README.md`

- Reset `config.json`

- Fixed few other places where console logs may show up out of order

## Week 6

### Thursday: October 8, 2020 (0 hours)

- Added support for running `nyu-dining-test.js` via `npm start`

- Updated `package.json`

- Updated `README.md`

## Week 7

### Monday: October 12, 2020 (2 hours)

- Added ability to load and parse HTML and extract location names

### Tuesday: October 13, 2020 (2 hours)

- Improved type safety and code readability

- Streamlined testing for production and dev sites

### Wednesday: October 14, 2020 (3 hours)

- Reverted `master` branch, released `1.0.0` version, and working on `sites-testing` branch from now on

- Reworked email-verifying regex

- Updated documentation to reflect type of dictionary- or enum-style `Object`s

- Improved time efficiency when displaying table of locations and statuses and reworked memory structures

- Streamlined experience if fatal errors occurred

- Added ability to test if location is on the production or dev site

- Added support for locations with multiple statuses (eg. `* Menu Error *` and `* Site Error *`)

### Thursday: October 15, 2020 (5 hours)

- Improve CLI prompt experience

- Improved error logging functionalities

- Added support for checking and logging excess locations in XML and on sites

- Added support for logging location status definitions

- Updated `README.md`

## Week 8

### Monday: October 19, 2020 (2 hours)

- Fixed excessive errors

- Tried to merge branches (but messed up)

- Created `v1.0.1` release