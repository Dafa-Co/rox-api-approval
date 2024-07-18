# Approval Program API
## Overview
The Approval Program API is designed to facilitate automatic transaction approvment workflow.\
This API is built using Express.js and Docker, making it easy to deploy and manage.

## Prerequisites

### Operating System

This project is designed to run on a Linux-based environment.

### Deployment Requirements
To make the application accessible globally, ensure the following:
- **Machine with Public IP Address or Domain**: You need a machine with a public IP address or a domain name (e.g., a cloud server or VPS) to deploy the application so that it can be accessed from the internet.

## Setup
### Installing Docker Engine
### On Ubuntu
Follow these steps to install Docker Engine on Ubuntu:
1. Update your existing list of packages:
```bash 
sudo apt update
```
2. Install required packages to allow apt to use a repository over HTTPS:
```bash 
sudo apt install apt-transport-https ca-certificates curl software-properties-common
```
3. Add Docker's official GPG key:
```bash 
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
```
4. Add the Docker APT repository:
```bash 
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
```
5. Update your package index again:
```bash
sudo apt update
```
6. Install Docker Engine:
```bash
sudo apt install docker-ce
```
7. Verify that Docker Engine is installed correctly by running:
```bash
sudo systemctl status docker
```
You should see Docker running. You can also run the following command to test Docker:

```bash
sudo docker run hello-world
```
### For Other Linux Distributions
If you are using a different Linux distribution, please refer to the official Docker documentation for detailed installation instructions: [Docker Installation Guide](https://docs.docker.com/engine/install/).


### Building the Docker Image
Build the Docker image from the **Dockerfile**:
```bash
docker build -t api-approval-program .
```
### Configuring Environment Variables
Before running the application, configure the necessary environment variables.

1. **Rename the Example Environment File**: In the root of your project directory, rename the \`.env.example\` file to \`.env\`.
```bash
mv .env.example .env
```
2. **Edit the \`.env\` File**: Open the \`.env\` file in a text editor and set the following environment variables to actual values suitable for your environment.\
`AWS_ENDPOINT`\
`AWS_ACCESS_KEY_ID`\
`AWS_SECRET_ACCESS_KEY`\
`AWS_REGION`\
`BUCKET_NAME`\
`AWS_DIRECTORY`

3. **Verify Environment Variables**: Make sure these variables are correctly defined and accessible. You can verify by running:

```bash
docker run --env-file .env api-approval-program
```
If there are issues with missing environment variables, Docker will indicate the problem in the logs.


## Running the Application

### Run the Docker Container

To run the Docker container and make the application accessible globally, you need to execute the following command on a machine with a public IP address or domain:
```bash
docker run -d --env-file .env -p 80:8080 --name api-approval-program api-approval-program
```
#### In this command:
- \``-d`\` runs the container in detached mode.
- \``--env-file .env`\` tells Docker to use the environment variables defined in the .env file.

- \``-p 80:8080`\` maps port 8080 inside the container to port 80 on your host machine. You can change 80 to any other port if needed.

**Note**: Make sure that port 80 (or your chosen port) is open on your machine’s firewall and accessible from the internet.

## Accessing the Application
Once the container is running, you can access the application using the base URL of the machine where the container is hosted.

### Base URL
- **Public IP Address**: If you are using a machine with a public IP address, the base URL will be \`http://<**PUBLIC_IP**>:<**PORT**>\`. For example, \`http://203.0.113.0:80\`.
- **Domain Name**: If you have configured a domain name to point to your machine, the base URL will be \`http://yourdomain.com\` or \`https://yourdomain.com\` if SSL is configured.

#### Example URL:

If your machine's public IP is \`**203.0.113.0**\` and you are using port \`**80**\`, your base URL will be **\`http://203.0.113.0\`**.

## Troubleshooting
If you encounter issues:
- Ensure Docker is running properly: **\`sudo systemctl status docker\`**.
- Check container logs: **\`docker logs api-approval-program\`**.

- Verify environment variables are set correctly: **\`docker run --env-file .env api-approval-program\`**.

## Contact
For any questions, please contact ``.

