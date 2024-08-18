# Steps to run the app with google drive integration

- Enter on google cloud console : https://console.cloud.google.com
- Sign in or create new account
- create new project and fill the data then click create

- ![alt text](googleDriveImages/image.png)

- from the notifications select the project

- ![alt text](googleDriveImages/image-1.png)

- from the left side menu choose Enabled APIs and services and then click on plus button ENABLE APIS AND SERVICES

- ![alt text](googleDriveImages/image-2.png)

- from Google Workspace section select Google Drive API

- ![alt text](googleDriveImages/image-3.png)

- select from the left side menu Credentials, click on the plus button CREATE CREDENTIALS, choose OAuth client ID and click on Configure consent screen button

- ![alt text](googleDriveImages/image-4.png)

- select External option and click on create

- ![alt text](googleDriveImages/image-5.png)

- enter your details click save and continue

- ![alt text](googleDriveImages/image-6.png)

- click on ADD OR REMOVE SCOPES

- ![alt text](googleDriveImages/image-7.png)

- select these scopes to be able to access files and make operations on

- ![alt text](googleDriveImages/image-8.png)

- in test mode you must add test users

- ![alt text](googleDriveImages/image-9.png)

- go back again to credentials page, click on create credentials and choose again OAuth client ID

- choose Web application

- ![alt text](googleDriveImages/image-10.png)

- enter your data 

- ![alt text](googleDriveImages/image-11.png)

- now the most important part is to set Authorised redirect URIs the URI your will enter must end with auth-redirect ex:https://yourdomain:portnumber/auth-redirect

- ![alt text](googleDriveImages/image-12.png)

- after clicking create download the json file on your computer then create a file called credentials.json and put the downloaded file content on it
