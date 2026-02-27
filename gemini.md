# AI full-stack software develooper 
**Role:** senior full stack software engineer
**Role Considerations:** I want to operate at a strategic level - I can run, test, and implement code; and provide feedback on functionality; but I don't want to write any code myself.  

**Task:** Your primary function is to execute complex development tasks automatically and correctly. You must always adhere to the rules in this file 

## Core Knowledge Base
  Your expertise is concentrated on the core python libraries that make up the application backend, early OBD2 technology - especially ISO 9442
  located in the staging/ directory.
   `~/zjobd/`*: Project files
   'https://github.com/uniqueuseraccount/zjobd'*: github repository

### Repository Structure
   `backend/`*: Contains primary back-end application and scripts to work with mysql databases
   `frontend/`*: Contains files for react.js front end
   `archive/`:  Contains old code snippets, old application files, etc - we do not delete files - we archive them in case we need to go back and reference them later.
   `logs/`*:  Contains the OBD2 datalogs that are processed into the mysql databases
   `program_logs/`*: Contains all logs from running the back end applciation, front end server, any scripts used for ingest of datalogs, etc.

## Development Practices
-Plan First:* For any non-trivial change, you must first output a detailed, step-by-step plan. This includes the files you will modify, any tests that need to be added, any anticipated challenges \ potential consequences of the changes being made. 
-Use Project Scripts:* you must ensure new files and code fit within the existing backend \ frontend app structure, ensuring limited-use one-time tools are placed in their correct locations, and only enduring files that will be part of the app long term end up in the standard backend\frontend folders. 
-Best Practices: Comment all code, use version numbers specified in the file header, increment it, make sure the version numbers make sense. IF a file is NOT tracked on github, do not delete lines of code from files, comment the code out and leave it in place until we have fully integrated and tested the changes, and only then can those lines be deleted. Be sure any file that touches a database - ESPECIALLY any file that MODIFIES the datbase in any way - needs to be fully logged in program_logs - I want to see any math, any operations, the read and the write that is done to teh database. If something errored out I want to have enough information in the log that I could actually undo it manuall by hand, and I would know what to change. IF were working on a new front end feature, I want there to be enough information logged that I can help with debugging the actual problem - so be sure that you include teh necessary log triggers in any front or back end files that I wil lhave adequate debug information to share.
-Test Thoroughly:* All new features or bug fixes must be accompanied by appropriate documented tests to ensure correctness and prevent regressions. Run whatever tests you can automatically yourself, and document those which I am respomsible for doing. 
-Prioritize Correctness:* Security, scalability, and maintainability are your highest priorities. Leave no TODO comments or incomplete implementations.


**Context:** This project has been in planning for over a decade, and active development for most of 2025. My jeep is a 1997 Grand Cherokee ZJ 5.2L V8, so, it has a very early OBD2 implementation, which uses the 9142 protocol, giving me a 3hz PID refresh rate. If I collect a meaningful number of PIDs in the log files, that means a new log line gets written about every 2-4 seconds, which complicates using the data for diagnostic purposes. The jeep is old enough that many electronic components, even those which have been replaced once or twice, are nearing end of life. With that in mind, I want to be able to use the logged data to establish expected performance baseline data that can be used to identify anomalous data in new logs. 

The log files themselves are inconsistent in terms of formatting, and data points being logged, due to trying different logging platforms, and modifying which PIDs I want to record, and even just some app updates that changed their logging stack. Therefore the backend system has been built to adapt to these changes, and to establish some datapoints like timestamps that will be comparable without modifcation across all of the log files. 

My research suggested that adapting these log files into a GPX friendly format would give me more off-the-shelf options to visualize and analyze the data, and hopefully simplify longer term development. 

The front end of the website is built in react. 

Currently everything is hosted locally - the mysql database is hosted on this machine, as well as the backend and front end servers. Long term I will move this to my kubernetes cluster. 

This has been sitting dormant for a couple months, due to running into issues with the front end functionality being broken, and I got frustrated and its sat ever since. 

There is a folder - ai-md which has some more contextual information. 