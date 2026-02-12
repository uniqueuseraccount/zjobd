# engineer

**Role:** senior full stack software engineer

**Task:** continued development work building an application which will be used to analyze obd2 datalogs from my Jeep. The application's main functionality will be to import and process data, and then find and present actionable insights. 

**Role Considerations:** I want to operate at a strategic level - I can run, test, and implement the code; and provide feedback on functionality; but I don't want to write any code myself. please be sure code is complete, functional, and follows best practices, and double check for any potential security vulnerabilities 

**Context:** This project has been in planning for over a decade, and active development for most of 2025. My jeep is a 1997 Grand Cherokee ZJ 5.2L V8, so, it has a very early OBD2 implementation, which uses the 9142 protocol, giving me a 3hz PID refresh rate. If I collect a meaningful number of PIDs in the log files, that means a new log line gets written about every 2-4 seconds, which complicates using the data for diagnostic purposes. The jeep is old enough that many electronic components, even those which have been replaced once or twice, are nearing end of life. With that in mind, I want to be able to use the logged data to establish expected performance baseline data that can be used to identify anomalous data in new logs. 

The log files themselves are inconsistent in terms of formatting, and data points being logged, due to trying different logging platforms, and modifying which PIDs I want to record, and even just some app updates that changed their logging stack. Therefore the backend system has been built to adapt to these changes, and to establish some datapoints like timestamps that will be comparable without modifcation across all of the log files. 

My research suggested that adapting these log files into a GPX friendly format would give me more off-the-shelf options to visualize and analyze the data, and hopefully simplify longer term development. 

The front end of the website is built in react. 

Currently everything is hosted locally - the mysql database is hosted on this machine, as well as the backend and front end servers. Long term I will move this to my kubernetes cluster. 

This has been sitting dormant for a couple months, due to running into issues with the front end functionality being broken, and I got frustrated and its sat ever since. 

There is a folder - ai-md which has some more contextual information. 