# NYU-Dining-Test

**A Script that Automatically Fetches NYU Dining Location and Menu Data, Parses and Validates it, and Emails the Users Should Errors Occur.**

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
   
3. (Optionally) [configure](#typical-configurations) [`config.json`](#properties-in-config-file).

4. Run the script `nyu-dining-test.js`.

    ```
    $ node nyu-dining-test.js
    ```
    or
    
    ```
    $ npm start
    ```
   
5. Follow the instructions and start testing!

## Typical Configurations

- If you want the program to automatically rerun after a set interval, and send you an automatic email notification **after each run** should errors occur, set `config.json` to:

    ```
    {
      "devMode": true,
      "autoRunIntervalInMinute": <positive_interval_in_minute>,
      "autoSendEmailAfterRun": 1,
      "sendEmailAfterShowingErrors": 0,
      "rememberEmail": 0,
      "rememberedEmail": <your_email_address>
    }
    ```

- If you want the program to automatically rerun after a set interval, but only email you **after you have asked the program to log all previously thrown error messages**, set `config.json` to:

    ```
    {
      "devMode": true,
      "autoRunIntervalInMinute": <positive_interval_in_minute>,
      "autoSendEmailAfterRun": 0,
      "sendEmailAfterShowingErrors": 1,
      "rememberEmail": 0,
      "rememberedEmail": ""
    }
    ```
    
    You can also optionally set `rememberEmail` or `rememberedEmail` to [non-default values](#properties-in-config-file) to streamline your workflow.

- If you want the program to automatically rerun after a set interval, **but never send you any email notifications**, set `config.json` to:

    ```
    {
      "devMode": true,
      "autoRunIntervalInMinute": <positive_interval_in_minute>,
      "autoSendEmailAfterRun": 0,
      "sendEmailAfterShowingErrors": 0,
      "rememberEmail": 0,
      "rememberedEmail": ""
    }
    ```

- If you **do not** want the program to automatically rerun, and **wish for a higher level of automation and flexibility**, set `devMode` to `true` in `config.json`, and set the rest of the properties [according to your preferences](#properties-in-config-file).

    ```
    {
      "devMode": true,
      "autoRunIntervalInMinute": 0,

      ...

    }
    ```

- If you **do not** want the program to automatically rerun, and **wish for a friendlier user interaction experience**, simply leave `config.json` as is and configure your preferences within the program.

## Properties in Config File

- `devMode` - **Required**. *Boolean*. Determines how the users want the program to run. Default to `false`. 
    
    > Set to `true` to achieve a higher level of automation and flexibility, or set to `false` to allow the users to modify the configuration directly within the program using keyboard interaction.

- `autoRunIntervalInMinute` - **Required**. *Number*. Determines if and how often the program should auto rerun. Default to `0`.
    
    > Set to a positive number and set `devMode` to `true` to let the program automatically rerun after the set interval (in minute).

- `autoSendEmailAfterRun` - **Required**. *Number*. Determines if the program should automatically email the users after the test finishes should errors occur. Default to `0`. Valid values are `-1`, `0`, and `1`.
    
    > Set to `1` and set `rememberedEmail` to a valid email address to always automatically receive an email after each run of the test and if at least one error has occurred, or set to `-1` to never receive any automatic email notifications after each run.

- `sendEmailAfterShowingErrors` - **Required**. *Number*. Determines if the program should email the users after the user prints all the previous errors. Default to `0`. Valid values are `-1`, `0`, and `1`.
    
    > Set to `1` to always be prompted to send an email after having asked the program to log all the previously thrown error messages (and optionally set `rememberedEmail` to a valid email address to let the program automatically use that email address), or set to `-1` to never be prompted to send any email notifications after asking the program to log error messages.

- `rememberEmail` - **Required**. *Number*. Determines if the program should remember the users’ inputted email address. Default to `0`. Valid values are `-1`, `0`, and `1`.
    
    > Set to `1` to let the program remember the first valid email address you inputted through keyboard if `rememberedEmail` is set to `""`, or set to `-1` to never let the program remember any inputted email addresses (unless `rememberedEmail` is already set to a valid email address, in which case `rememberedEmail` will always be used regardless of the value of `rememberEmail`).

- `rememberedEmail` - **Required**. *String*. The remembered users’ inputted email address, or an empty string if it does not exist. Default to `""`. Valid values are `""` and valid email addresses.
    
    > Set to a valid email address to enable automatic email notifications should errors occur.

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