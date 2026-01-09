pipeline {
    agent any

    environment {
        // --- 1. SERVER DETAILS ---
        APP_SERVER_IP   = '13.201.73.113'
        // The directory you manually created on the server
        PROJECT_DIR     = '/home/ubuntu/devops-tier3-project-monitoring'

        // --- 2. CREDENTIAL IDs (From Jenkins) ---
        DOCKER_CREDS_ID = 'docker-hub-login'
        SSH_KEY_ID      = 'ec2-ssh-key'
    }

    stages {
        // ----------------------------------------------------------------
        // STAGE 1: CHECKOUT SCM
        // ----------------------------------------------------------------
        stage('Checkout Code') {
            steps {
                echo "📥 Cloning Repository..."
                // Make sure this URL matches your Git Repo exactly
                git branch: 'main', url: 'https://github.com/Eklak-Alam/devops-tier3-project-monitoring.git'
            }
        }

        // ----------------------------------------------------------------
        // STAGE 2: BUILD & PUSH (Dynamic & Secure)
        // ----------------------------------------------------------------
        stage('Build & Push Docker Images') {
            steps {
                script {
                    // 🔐 Extract Username (DUSER) & Password (DPASS) from Jenkins Credentials
                    withCredentials([usernamePassword(credentialsId: DOCKER_CREDS_ID, passwordVariable: 'DPASS', usernameVariable: 'DUSER')]) {
                        
                        echo "🐳 Logging into Docker Hub as '${DUSER}'..."
                        sh "echo $DPASS | docker login -u $DUSER --password-stdin"
                        
                        // --- DEFINE EXACT IMAGE NAMES ---
                        // This matches: eklakalam/devops-tier3-monitoring-backend
                        def backendImg  = "${DUSER}/devops-tier3-monitoring-backend"
                        def frontendImg = "${DUSER}/devops-tier3-monitoring-frontend"

                        // --- BACKEND BUILD ---
                        echo "🔨 Building Backend Image: ${backendImg}"
                        // Assuming your git folder is named 'backend'
                        sh "docker build -t ${backendImg}:latest ./backend"
                        sh "docker push ${backendImg}:latest"

                        // --- FRONTEND BUILD ---
                        echo "🔨 Building Frontend Image: ${frontendImg}"
                        // Assuming your git folder is named 'frontend'
                        sh "docker build --build-arg NEXT_PUBLIC_API_URL=http://${APP_SERVER_IP}:5000 -t ${frontendImg}:latest ./frontend"
                        sh "docker push ${frontendImg}:latest"
                    }
                }
            }
        }

        // ----------------------------------------------------------------
        // STAGE 3: DEPLOY (Remote Update)
        // ----------------------------------------------------------------
        stage('Deploy to App Server') {
            steps {
                sshagent([SSH_KEY_ID]) {
                    echo "🚀 Connecting to Server (${APP_SERVER_IP}) to update containers..."
                    sh """
                        ssh -o StrictHostKeyChecking=no ubuntu@${APP_SERVER_IP} '
                            
                            # 1. Navigate to the folder you created
                            cd ${PROJECT_DIR} || exit 1
                            
                            # 2. Pull the latest images we just pushed
                            echo "📥 Pulling updates..."
                            sudo docker-compose pull
                            
                            # 3. Restart Containers (Updates the app)
                            echo "🔄 Restarting application..."
                            sudo docker-compose up -d --remove-orphans
                            
                            # 4. Cleanup old images to save space
                            echo "🧹 Pruning old images..."
                            sudo docker image prune -f
                        '
                    """
                }
            }
        }
    }
}