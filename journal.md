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

### Monday: September 14, 2020 (2 hours)

- Added ability to use custom functions to console log messages and push it to an error messages array if needed

- Added ability to show a table of location names and corresponding testing results

- Added ability to listen to keyboard inputs and display information accordingly

- Added ability to rerun all tests