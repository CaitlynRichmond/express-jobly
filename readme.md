# Jobly - Backend
Jobly is an indeed like application

You can view the frontend [here](https://github.com/CaitlynRichmond/react-jobly)

View the deployed site [here](https://malicious-question.surge.sh/), deployed with Render and Surge. It may take a few minutes for Render to spin up.

## Tech Stack
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)

## Features
Here is an overview of some of the key features

- 95%+ test coverage
- Full credentialing is implemented: users can log in, sign up, and update their profiles
- Routes are protected with middleware
- Searching of jobs and companies is done with full text search
- Routes for applying to jobs

## Local setup instructions
Fork and clone this repo
```
cd [path_to_your_cloned_backend]
npm install
npm start
```
the backend will now be running locally on port 3001

Fork and clone the [frontend](https://github.com/CaitlynRichmond/react-jobly)

```
cd [path_to_your_cloned_frontend]
npm install
npm start
```
the frontend will now be running locally on port 3000


## Tests
- This project has 95% coverage of tests on the backend

to run the tests
```
jest -i (run all tests)
jest -i --coverage (generate a coverage report)
```

## To-Dos
- get tests to 100% coverage
- refactor the project to use typescript

## Acknowledgements
The backend of Jobly was built during my time at Rithm School, as part of a 3-day sprint. My partner on the backend was [Akhaylin Rajagopaul](https://github.com/akhaylin)