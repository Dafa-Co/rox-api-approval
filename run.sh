#!/bin/bash

# Function to check if Docker is installed
check_docker_installed() {
    if ! command -v docker &>/dev/null; then
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
    if command -v docker &>/dev/null; then
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
    local choice=$1  # Use the first argument as the choice

    if [ -z "$choice" ]; then
        # If no argument is passed, prompt the user
        echo "Please choose an option:"
        echo "1) AWS S3"       # .env
        echo "2) One Drive"    # credentials.json
        echo "3) Google Drive" # credentials.json
        echo "4) Dropbox"      # .env
        read -p "Enter your choice (1-4): " choice
    fi

    case $choice in
        1)
            echo "You chose AWS S3."
            # Collect AWS credentials
            read -p "Enter AWS Endpoint: " aws_endpoint
            read -p "Enter Bucket Key: " bucket_key
            read -p "Enter Bucket Secret: " bucket_secret
            read -p "Enter Bucket Region: " bucket_region
            read -p "Enter Bucket Name: " bucket_name

            # Write to .env file
            echo "AWS_ENDPOINT=$aws_endpoint" >>.env
            echo "BUCKETKEY=$bucket_key" >>.env
            echo "BUCKETSECRET=$bucket_secret" >>.env
            echo "BUCKETREGION=$bucket_region" >>.env
            echo "BUCKETNAME=$bucket_name" >>.env
            echo "HANDLER=amazonS3" >>.env

            file_to_mount=".env"
            docker_image="roxcustody/amazons3"

            ;;
        2)
            echo "You chose One Drive."
            while true; do
                read -p "Enter the path to your One Drive credentials.json: " one_drive_path
                one_drive_path="${one_drive_path/#\~/$HOME}"
                if [[ -f "$one_drive_path" ]]; then
                    cp "$one_drive_path" "$(dirname "$0")/credentials.json"
                    echo "Credentials have been copied to the script's directory."
                    echo "HANDLER=oneDrive" >>.env
                    break
                else
                    echo "File not found. Please enter a valid path."
                fi
            done

            file_to_mount="credentials.json"
            docker_image="roxcustody/one_drive"

            ;;
        3)
            echo "You chose Google Drive."
            while true; do
                read -p "Enter the Full path (absolute) to your Google Drive credentials.json: " google_drive_path
                google_drive_path="${google_drive_path/#\~/$HOME}"

                if [[ -f "$google_drive_path" ]]; then
                    cp "$google_drive_path" "$(dirname "$0")/credentials.json"
                    echo "Credentials have been copied to the script's directory."
                    echo "HANDLER=googleDrive" >>.env
                    break
                else
                    echo "File not found. Please enter a valid path."
                fi
            done

            file_to_mount="credentials.json"
            docker_image="roxcustody/google_drive"

            ;;
        4)
            echo "You chose Dropbox."
            # Collect Dropbox credentials
            read -p "Enter Dropbox Access Token: " dropbox_access_token
            read -p "Enter Dropbox Client ID: " dropbox_client_id
            read -p "Enter Dropbox Client Secret: " dropbox_client_secret

            # Write to .env file
            echo "DROPBOX_ACCESS_TOKEN=$dropbox_access_token" >>.env
            echo "DROPBOX_CLIENT_ID=$dropbox_client_id" >>.env
            echo "DROPBOX_CLIENT_SECRET=$dropbox_client_secret" >>.env
            echo "HANDLER=dropbox" >>.env

            file_to_mount=".env"
            docker_image="roxcustody/dropbox"

            ;;
        *)
            echo "Invalid choice. Please select a number between 1 and 4."
            exit 1
            ;;
    esac
}

# Find an available port
find_available_port() {
    local start_port=3000
    local end_port=65535

    for port in $(seq $start_port $end_port); do
        if ! nc -z localhost $port; then
            echo $port
            return 0
        fi
    done
    echo "No available port found in range $start_port-$end_port."
    exit 1
}

# Use the first argument passed to the script as the user's choice
display_options "$1"

# ask the user for the domain or the ip of the vm
read -p "Please add the ip of this machine : " user_domain

echo "Domain or IP: $user_domain"

# Validate the domain or the IP
if ! [[ "$user_domain" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] && ! [[ "$user_domain" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$ ]]; then
    echo "Invalid domain or IP. Please enter a valid domain or IP."
    exit 1
fi

read -p "Please add your RoxCustody's subdomain (your subdomain.roxcustody.io): " corporate_subdomain

read -p "Please add your self custody manager (SCM) key: " api_key
echo "API_KEY=$api_key" >>.env
echo "DOMAIN=$user_domain" >>.env


# Automatically select a port
user_port=$(find_available_port)

# CONST ENVS
echo "PORT=3000" >>.env
echo "URL=http://$user_domain:$user_port" >>.env
echo "CUSTODY_URL=https://${corporate_subdomain}.api-custody.roxcustody.io/api" >>.env

# Run the Docker container with the file mounted
echo "Running the application on $user_domain:$user_port... $file_to_mount"

docker run -d -p $user_port:3000 -v "$(pwd)/$file_to_mount":/usr/src/app/$file_to_mount -v "$(pwd)/.env":/usr/src/app/.env $docker_image
echo "Container is running on port $user_port and $file_to_mount has been added inside the container."
