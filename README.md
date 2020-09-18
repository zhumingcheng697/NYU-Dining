# NYU-Dining-Test

**A Script that Fetches NYU Dining Location and Menu Data, Parses and Validates it, and Automatically Emails the Users Should Errors Occur.**

## Features

- Check the availability and validity of the location and menu data from the S3 bucket on which the dining portion of NYU Mobile relies

- Email the users a copy of all the previously thrown error messages

- Automatically rerun all the tests after a set interval or manually rerun all the tests with keyboard commands

- Print out a table with names of all loaded locations and if they have failed the test, and if so, on which part of the test they each have failed

## How to Set Up

1. Clone this repo.
    ```
    $ git clone https://github.com/zhumingcheng697/NYU-Dining-Test.git
    ```
   
2. Install necessary node modules.
    ```
    $ npm install
    ```
   
3. Configure the preferences in `config.json`.

4. Run the script `nyu-dining-test.js`.
    ```
    $ node nyu-dining-test.js
    ```
   
5. Follow the instructions and start testing!

## Validation Workflow

1. Check if `locations.json`:
    1. can be loaded from the S3 bucket
    2. can be parsed as JSON
    3. contains data for any dining locations, and if so, for how many
    
2. Check if `locations.xml`:
    1. can be loaded from the S3 bucket
    2. can be parsed as XML
    3. contains data for any dining locations, and if so, for how many
    
3. Check if each dining location:
    1. has field `open`, and if so, is it set to `true` or `false`
    2. has field `schedules`, and if so, how many schedules are there
    3. has field `menuURL`, and if so, if the JSON file at that URL:
        1. can be loaded from the S3 bucket
        2. can be parsed as JSON
        3. has field `menus`, and if so, how many menus are there