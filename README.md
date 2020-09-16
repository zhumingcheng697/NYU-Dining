# NYU-Dining-Test

**A Script that Fetches NYU Dining Location and Menu Data from the S3 Bucket and Parses and Validates that Data.**

## Features

- Check the availability and validity of the location and menu data from the S3 bucket on which the dining portion of NYU Mobile relies

- Print out the result for each and every test for each and every loaded location when the tests are running

- Print out all error messages previously thrown after all tests have been completed

- Print out a list of locations that have passed all tests

- Print out a list of locations that have passed one part of the tests but failed on the other part

- Print out a list of locations that have failed on both parts of the test

- Print out a table for all locations with their names and if they have failed the test, and if so, on which part of the test they each have failed

- Rerun all the tests again if you would like to

## How to Set Up

1. Clone this repo.
    ```
    $ git clone https://github.com/zhumingcheng697/NYU-Dining-Test.git
    ```
   
2. Install necessary node modules.
    ```
    $ npm install
    ```
   
3. Run the script `nyu-dining-test.js`.
    ```
    $ node nyu-dining-test.js
    ```
   
4. Follow the instructions and start testing!

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