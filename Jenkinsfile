pipeline {
    agent any

    environment {
        // --- 1. CONFIGURATION ---
        APP_SERVER_IP   = '13.204.82.99'
        PROJECT_DIR     = '/home/ubuntu/devops-tier3-project-monitoring'
        
        // --- 2. CREDENTIALS ---
        DOCKER_CREDS_ID = 'docker-hub-login'
        SSH_KEY_ID      = 'ec2-ssh-key'
        
        // --- 3. SECRETS (Ideally put these in Jenkins Credentials, but defined here for simplicity) ---
        // In a real job, use credentials('db-password')
        DB_PASS_VAL     = 'Eklakalam@7070' 
    }

    stages {
        // ----------------------------------------------------------------
        // STAGE 1: CHECKOUT
        // ----------------------------------------------------------------
        stage('Checkout Code') {
            steps {
                echo "📥 Cloning Repository..."
                git branch: 'main', url: 'https://github.com/Eklak-Alam/devops-tier3-project-monitoring.git'
            }
        }

        // ----------------------------------------------------------------
        // STAGE 2: BUILD & PUSH
        // ----------------------------------------------------------------
        stage('Build & Push Images') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: DOCKER_CREDS_ID, passwordVariable: 'DPASS', usernameVariable: 'DUSER')]) {
                        
                        echo "🐳 Logging into Docker Hub..."
                        sh "echo $DPASS | docker login -u $DUSER --password-stdin"
                        
                        def backendImg  = "${DUSER}/devops-tier3-monitoring-backend"
                        def frontendImg = "${DUSER}/devops-tier3-monitoring-frontend"

                        // --- BACKEND ---
                        echo "🔨 Building Backend..."
                        sh "docker build -t ${backendImg}:latest ./backend"
                        sh "docker push ${backendImg}:latest"

                        // --- FRONTEND ---
                        echo "🔨 Building Frontend..."
                        // We bake the IP into the frontend at build time
                        sh "docker build --build-arg NEXT_PUBLIC_API_URL=http://${APP_SERVER_IP}:5000 -t ${frontendImg}:latest ./frontend"
                        sh "docker push ${frontendImg}:latest"
                    }
                }
            }
        }

        // ----------------------------------------------------------------
        // STAGE 3: DEPLOY (Copy Configs + Generate Env + Restart)
        // ----------------------------------------------------------------
        stage('Deploy to Production') {
            steps {
                sshagent([SSH_KEY_ID]) {
                    echo "🚀 Deploying to ${APP_SERVER_IP}..."
                    
                    // 1. Ensure Directory Exists on Remote Server
                    sh "ssh -o StrictHostKeyChecking=no ubuntu@${APP_SERVER_IP} 'mkdir -p ${PROJECT_DIR}'"

                    // 2. Securely Copy Configuration Files (Infrastructure as Code)
                    // We copy docker-compose and the monitoring config so the server is always synced with Git
                    sh "scp -o StrictHostKeyChecking=no docker-compose.yml ubuntu@${APP_SERVER_IP}:${PROJECT_DIR}/docker-compose.yml"
                    
                    // Assuming your prometheus.yml is in a folder named 'monitoring' in your git repo
                    // If it's in root, remove 'monitoring/' from the source path
                    sh "scp -o StrictHostKeyChecking=no monitoring/prometheus.yml ubuntu@${APP_SERVER_IP}:${PROJECT_DIR}/prometheus.yml"

                    // 3. Remote Execution
                    sh """
                        ssh -o StrictHostKeyChecking=no ubuntu@${APP_SERVER_IP} '
                            cd ${PROJECT_DIR}

                            echo "⚙️  Generating dynamic .env file..."
                            # We overwrite the .env file with fresh values from Jenkins
                            echo "DB_HOST=db" > .env
                            echo "DB_USER=root" >> .env
                            echo "DB_PASSWORD=${DB_PASS_VAL}" >> .env
                            echo "DB_NAME=webapp" >> .env
                            echo "DB_PORT=3306" >> .env
                            echo "SERVER_IP=${APP_SERVER_IP}" >> .env

                            echo "📥 Pulling latest images..."
                            sudo docker-compose pull

                            echo "🔄 Restarting services..."
                            # --remove-orphans ensures deleted services in docker-compose are removed
                            sudo docker-compose up -d --remove-orphans

                            echo "🧹 Pruning old images..."
                            sudo docker image prune -f
                        '
                    """
                }
            }
        }
    }
}