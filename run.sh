#!/bin/bash

# Function to check if Docker is installed
check_docker_installed() {
    if ! command -v docker &> /dev/null
    then
        echo "Docker could not be found on your system."
        return 1
    else
        echo "Docker is installed."
        return 0
    fi
}

# Function to install Docker
install_docker() {
    echo "Starting Docker installation..."
    # Download the script and verify its integrity before executing
    curl -o install-docker.sh https://releases.rancher.com/install-docker/24.0.sh
    # Optional: Check the script's checksum here for security
    sh install-docker.sh
    rm install-docker.sh
    if command -v docker &> /dev/null; then
        echo "Docker installation completed."
    else
        echo "Docker installation failed. Please install Docker manually."
        exit 1
    fi
}

# Check if Docker is installed
check_docker_installed || {
    echo "Would you like to install Docker? (yes/no)"
    read install_choice
    if [ "$install_choice" == "yes" ]; then
        install_docker
    else
        echo "Docker is required to proceed."
        exit 1
    fi
}

# Function to display options and get user choice
display_options() {
    while true; do
        echo "Please choose an option:"
        echo "1) AWS S3" # .env
        echo "2) One Drive" # credentials.json
        echo "3) Google Drive" # credentials.json
        echo "4) Dropbox" # .env
        read -p "Enter your choice (1-4): " choice
        case $choice in
            1)
                echo "You chose AWS S3."
                # Collect AWS credentials
                read -p "Enter AWS Endpoint: " aws_endpoint
                read -p "Enter Bucket Key: " bucket_key
                read -p "Enter Bucket Secret: " bucket_secret
                read -p "Enter Bucket Region: " bucket_region
                read -p "Enter Bucket Name: " bucket_name
                read -p "Enter AWS Directory: " aws_directory

                # Write to .env file
                echo "AWS_ENDPOINT=$aws_endpoint" >> .env
                echo "BUCKETKEY=$bucket_key" >> .env
                echo "BUCKETSECRET=$bucket_secret" >> .env
                echo "BUCKETREGION=$bucket_region" >> .env
                echo "BUCKETNAME=$bucket_name" >> .env
                echo "AWS_DIRECTORY=$aws_directory" >> .env

                file_to_mount=".env"

                echo "AWS credentials have been added to .env file."
                break
                ;;
            2)
                while true; do
                    echo "You chose One Drive."
                    read -p "Enter the path to your One Drive credentials.json: " one_drive_path
                    if [[ -f "$one_drive_path" ]]; then
                        cp "$one_drive_path" "$(dirname "$0")/credentials.json"
                        echo "Credentials have been copied to the script's directory."
                        break
                    else
                        echo "File not found. Please enter a valid path."
                    fi
                done

                file_to_mount="credentials.json"

                break
                ;;
            3)
                while true; do
                    echo "You chose Google Drive."
                    read -p "Enter the path to your Google Drive credentials.json: " google_drive_path
                    if [[ -f "$google_drive_path" ]]; then
                        cp "$google_drive_path" "$(dirname "$0")/credentials.json"
                        echo "Credentials have been copied to the script's directory."
                        break
                    else
                        echo "File not found. Please enter a valid path."
                    fi
                done

                file_to_mount="credentials.json"

                break
                ;;
            4)
                echo "You chose Dropbox."
                # Collect Dropbox credentials
                read -p "Enter Dropbox Access Token: " dropbox_access_token
                read -p "Enter Dropbox Client ID: " dropbox_client_id
                read -p "Enter Dropbox Client Secret: " dropbox_client_secret

                # Write to .env file
                echo "DROPBOX_ACCESS_TOKEN=$dropbox_access_token" >> .env
                echo "DROPBOX_CLIENT_ID=$dropbox_client_id" >> .env
                echo "DROPBOX_CLIENT_SECRET=$dropbox_client_secret" >> .env

                file_to_mount=".env"

                echo "Dropbox credentials have been added to .env file."
                break
                ;;
            *)
                echo "Invalid choice. Please select a number between 1 and 4."
                ;;
        esac
    done
}

# Get user choice
display_options

# Ask for the port number
read -p "Please enter the port you would like to run the application on: " user_port

# Validate the port number
if [[ ! "$user_port" =~ ^[0-9]+$ ]] || [ "$user_port" -lt 1 ] || [ "$user_port" -gt 65535 ]; then
    echo "Invalid port number. Please enter a valid port number between 1 and 65535."
    exit 1
fi

# Run the Docker container with the file mounted
echo "Running Docker container on port $user_port..."
docker run -d -p $user_port:$user_port -v "$(pwd)/$file_to_mount":/app/$file_to_mount rox-api-approval
echo "Container is running on port $user_port and $file_to_mount has been added inside the container."
