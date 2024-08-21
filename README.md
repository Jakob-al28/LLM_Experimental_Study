# LLM Experiment

## Introduction
This repository contains all the necessary files to replicate the experiment, including the R file and the data. 
To find the R file and the experiment data, navigate to the `experiment_data_analysis` directory.

## Requirements
- **Node.js**: To run this project, you need to have Node.js installed on your system.
  - I recommend using **nodemon** for easier development. Nodemon will automatically restart the server when code changes are detected.

- **MongoDB**: If you want to store data, ensure you have a local MongoDB instance running. This is optional, and the project will still run without it.

## Getting Started

1. **Install Node.js**:
   - Download and install Node.js from [nodejs.org](https://nodejs.org/).
   
2. **Install Nodemon (Optional but recommended)**:
   - You can install nodemon globally by running the following command:
     ```bash
     npm install -g nodemon
     ```

3. **Run the Project**:
   - Navigate to the project directory.
   - To run the server, use one of the following commands:
     ```bash
     node server.js
     ```
     Or, if you have nodemon installed:
     ```bash
     nodemon server.js
     ```

## Usage
- After starting the server, it should be accessible via `http://localhost:3000` (or another port if specified).
- If MongoDB is configured, data will be stored locally in your MongoDB instance.

## License
This project is licensed under the MIT License.
