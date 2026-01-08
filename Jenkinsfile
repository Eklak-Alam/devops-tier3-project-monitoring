pipeline {
    agent any

    environment {
        DOCKER_HUB = 'your_dockerhub_username'
        IMAGE_BACKEND = "${DOCKER_HUB}/gaprio-backend"
        IMAGE_FRONTEND = "${DOCKER_HUB}/gaprio-frontend"
        SERVER_IP = '13.233.xx.xx' // Your EC2 IP
        SSH_KEY = 'ec2-ssh-key'     // Jenkins Credential ID
    }

    stages {
        // STAGE 1: Build & Test
        stage('Build & Push Images') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'docker-hub-creds', usernameVariable: 'DUSER', passwordVariable: 'DPASS')]) {
                        sh "echo $DPASS | docker login -u $DUSER --password-stdin"
                        
                        // Backend
                        sh "docker build -t ${IMAGE_BACKEND}:latest ./backend"
                        sh "docker push ${IMAGE_BACKEND}:latest"

                        // Frontend (Pass build args)
                        sh "docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:5000 -t ${IMAGE_FRONTEND}:latest ./frontend"
                        sh "docker push ${IMAGE_FRONTEND}:latest"
                    }
                }
            }
        }

        // STAGE 2: Deploy to EC2
        stage('Deploy to Production') {
            steps {
                sshagent([SSH_KEY]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ubuntu@${SERVER_IP} '
                            cd /home/ubuntu/gaprio-app
                            
                            # Update .env file dynamically
                            echo "DB_HOST=db" > .env
                            echo "DB_PASSWORD=Eklakalam@7070" >> .env
                            echo "NODE_ENV=production" >> .env
                            
                            # Pull new images
                            docker-compose pull
                            
                            # Restart containers (Update only)
                            docker-compose up -d --remove-orphans
                            
                            # Cleanup space
                            docker image prune -f
                        '
                    """
                }
            }
        }
    }
}