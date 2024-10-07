#!/bin/bash

# Function to build and push Docker image
build_and_push() {
    service_name=$1
    image_tag="roxcustody/${service_name}:1.0.0"

    echo "Building Docker image for ${service_name}..."
    docker build -t $image_tag .

    if [ $? -eq 0 ]; then
        echo "Pushing Docker image for ${service_name}..."
        docker push $image_tag

        if [ $? -eq 0 ]; then
            echo "Successfully pushed ${image_tag}."
        else
            echo "Failed to push ${image_tag}. Exiting."
            exit 1
        fi
    else
        echo "Failed to build ${image_tag}. Exiting."
        exit 1
    fi
}

# List of services
services=("amazons3" "google_drive" "one_drive" "dropbox")

# Loop through services and build/push each Docker image
for service in "${services[@]}"; do
    build_and_push $service
done
