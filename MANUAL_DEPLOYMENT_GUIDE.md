# MANUAL AWS DEPLOYMENT GUIDE - STEP BY STEP

## The Simple Flow (What We're Building)

```
Your Code on GitHub
        ↓
Webhook triggers (manually setup)
        ↓
CodeBuild builds Docker images (manual steps shown)
        ↓
Images pushed to ECR (manual commands)
        ↓
ECS runs containers (manual setup)
        ↓
Load Balancer routes traffic
        ↓
🎉 App is LIVE!
```

---

## PART 1: AWS SETUP (Manual - Using Console)

### Step 1: Create IAM Roles (via AWS Console)

Go to: **AWS Console → IAM → Roles → Create Role**

#### Create CodePipelineServiceRole
1. Click "Create Role"
2. Select: **AWS Service** → **CodePipeline**
3. Click "Next"
4. Add policies (checkboxes):
   - [ ] `AWSCodePipelineFullAccess`
   - [ ] `AmazonEC2ContainerRegistryFullAccess`
   - [ ] `AWSCodeBuildAdminAccess`
   - [ ] `AWSCodeDeployFullAccess`
5. Click "Next" → Name: `CodePipelineServiceRole` → Create

#### Create CodeBuildServiceRole
1. Click "Create Role"
2. Select: **AWS Service** → **CodeBuild**
3. Click "Next"
4. Add policies:
   - [ ] `AWSCodeBuildAdminAccess`
   - [ ] `AmazonEC2ContainerRegistryPowerUser`
   - [ ] `CloudWatchLogsFullAccess`
5. Name: `CodeBuildServiceRole` → Create

#### Create ecsTaskExecutionRole
1. Click "Create Role"
2. Select: **AWS Service** → **ECS Task**
3. Add policy: `AmazonECSTaskExecutionRolePolicy`
4. Name: `ecsTaskExecutionRole` → Create

---

### Step 2: Create ECR Repositories (Manually)

Go to: **AWS Console → ECR → Repositories → Create Repository**

#### Create Backend Repository
1. Repository name: `kudos-backend`
2. Image scan: Check "Scan on push"
3. Encryption: Default
4. Click "Create"
5. **Copy the URI** (you'll need it later)

#### Create Frontend Repository
1. Repository name: `kudos-frontend`
2. Same settings
3. Click "Create"
4. **Copy the URI**

---

### Step 3: Create VPC & Networking (Manually)

Go to: **AWS Console → VPC → Create VPC**

#### Create VPC
1. Name: `kudos-vpc`
2. CIDR block: `10.0.0.0/16`
3. Click "Create"
4. Note the VPC ID

#### Create Subnets
Go to: **VPC → Subnets → Create Subnet**

**Subnet 1:**
- VPC: Select `kudos-vpc`
- Subnet name: `kudos-subnet-1`
- Availability Zone: `us-east-1a`
- CIDR block: `10.0.1.0/24`
- Create

**Subnet 2:**
- VPC: Select `kudos-vpc`
- Subnet name: `kudos-subnet-2`
- Availability Zone: `us-east-1b`
- CIDR block: `10.0.2.0/24`
- Create

#### Create Security Group
Go to: **EC2 → Security Groups → Create Security Group**

1. Name: `kudos-sg`
2. VPC: Select `kudos-vpc`
3. Inbound Rules: Click Add Rule
   - Protocol: TCP
   - Port Range: 0-65535 (all ports)
   - Source: 0.0.0.0/0
4. Create

---

### Step 4: Create ECS Cluster (Manually)

Go to: **AWS Console → ECS → Create Cluster**

1. Cluster name: `kudos-cluster`
2. Networking: Select `kudos-vpc`
3. Default capacity provider: `FARGATE`
4. Click "Create"

---

### Step 5: Create Load Balancer (Manually)

Go to: **EC2 → Load Balancers → Create Load Balancer**

#### Create Application Load Balancer
1. Name: `kudos-lb`
2. Scheme: Internet-facing
3. VPC: Select `kudos-vpc`
4. Subnets: Select both `kudos-subnet-1` and `kudos-subnet-2`
5. Security Group: Select `kudos-sg`
6. Click "Next"

#### Create Target Group
1. Name: `kudos-tg`
2. Protocol: HTTP
3. Port: 80
4. VPC: `kudos-vpc`
5. Health check path: `/health`
6. Click "Next" → Create

#### Finish Load Balancer
1. Select target group: `kudos-tg`
2. Click "Create"
3. **Copy the Load Balancer DNS** (something like: `kudos-lb-123456.us-east-1.elb.amazonaws.com`)

---

## PART 2: BUILD YOUR DOCKER IMAGES LOCALLY

### Step 1: Navigate to Your Project

```bash
cd /home/yatin/Desktop/My\ Notes/DevOps-Projetcs/kudos-board
```

### Step 2: Build Backend Image Locally

```bash
# Build backend
docker build -t kudos-backend:v1 ./backend

# Test it runs
docker run -p 5050:5000 -e MONGO_URI=mongodb://localhost:27017 kudos-backend:v1
# Should see: "Server running on port 5000"
```

### Step 3: Build Frontend Image Locally

```bash
# Build frontend
docker build -t kudos-frontend:v1 ./frontend

# Test it
docker run -p 3000:3000 kudos-frontend:v1
# Should see: Vite dev server
```

### Step 4: Test Together with docker-compose

```bash
# Start all 3 services together
docker-compose up

# Wait for all to start...
# Try: http://localhost:8080 (frontend)
# Try: http://localhost:5050/health (backend health check)

# Press Ctrl+C to stop
```

---

## PART 3: PUSH IMAGES TO ECR (Manually)

### Step 1: Login to ECR

Get your AWS Account ID first:
```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo $AWS_ACCOUNT_ID  # Should print your 12-digit account ID
```

Login:
```bash
AWS_REGION=us-east-1

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### Step 2: Tag Backend Image

```bash
# Your ECR repository URI (from earlier)
BACKEND_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kudos-backend"

# Tag the image
docker tag kudos-backend:v1 $BACKEND_URI:v1
docker tag kudos-backend:v1 $BACKEND_URI:latest

# Push to ECR
docker push $BACKEND_URI:v1
docker push $BACKEND_URI:latest
```

### Step 3: Tag Frontend Image

```bash
FRONTEND_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kudos-frontend"

docker tag kudos-frontend:v1 $FRONTEND_URI:v1
docker tag kudos-frontend:v1 $FRONTEND_URI:latest

docker push $FRONTEND_URI:v1
docker push $FRONTEND_URI:latest
```

### Verify in ECR Console
Go to: **AWS Console → ECR** 
- Should see both repositories with images

---

## PART 4: CREATE ECS TASK DEFINITION (Manually)

Go to: **AWS Console → ECS → Task Definitions → Create New Task Definition**

### Create Task Definition

1. Name: `kudos-taskdef`
2. Launch Type: **FARGATE**
3. OS/Architecture: Linux/x86_64
4. CPU: 512
5. Memory: 1GB
6. Task Execution Role: `ecsTaskExecutionRole`

### Add Containers

#### Container 1: MongoDB

Click "Add Container"
- Name: `kudos-database`
- Image: `mongo:7.0`
- Port mappings: `27017:27017`
- Essential: YES
- Log config:
  - Log driver: awslogs
  - Log group: Create new: `/ecs/kudos`
  - Log stream prefix: `database`
- Click "Add"

#### Container 2: Backend

Click "Add Container"
- Name: `kudos-backend`
- Image: `$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/kudos-backend:latest`
  (Replace with your actual URI)
- Port mappings: `5000:5000`
- Environment variables:
  - `MONGO_URI` = `mongodb://kudos-database:27017/kudosboard`
  - `PORT` = `5000`
- Log config:
  - Log driver: awslogs
  - Log group: `/ecs/kudos`
  - Log stream prefix: `backend`
- Click "Add"

#### Container 3: Frontend

Click "Add Container"
- Name: `kudos-frontend`
- Image: `$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/kudos-frontend:latest`
- Port mappings: `3000:80`
- Environment variables:
  - `VITE_API_URL` = `http://kudos-backend:5000`
- Log config:
  - Log driver: awslogs
  - Log group: `/ecs/kudos`
  - Log stream prefix: `frontend`
- Click "Add"

### Save Task Definition

Click "Create"

---

## PART 5: CREATE ECS SERVICE (Manually)

Go to: **AWS Console → ECS → Clusters → kudos-cluster → Create Service**

1. Launch type: **FARGATE**
2. Task definition: `kudos-taskdef:1`
3. Service name: `kudos-service`
4. Desired count: **2** (for high availability)
5. VPC: `kudos-vpc`
6. Subnets: Select both
7. Security group: Select `kudos-sg`
8. Public IP: ENABLED
9. Load Balancer: 
   - Type: **Application Load Balancer**
   - Load Balancer: `kudos-lb`
   - Container: `kudos-frontend:3000`
   - Target group: `kudos-tg`
10. Click "Create"

Wait... tasks should start. Go to **Clusters → kudos-cluster → kuduos-service** and watch:

```
Initial state: 0 running, 2 desired
↓
↓ (wait ~2 min)
↓
Final state: 2 running, 2 desired ✅
```

---

## PART 6: TEST YOUR APP

Get the load balancer DNS:
```bash
aws elbv2 describe-load-balancers \
  --names kudos-lb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

Test in browser:
- Frontend: `http://<your-dns>`
- Health check: `http://<your-dns>/health`
- API: `http://<your-dns>/api`

---

## PART 7: SETUP CODEBUILD (For Automatic Builds)

Go to: **AWS Console → CodeBuild → Create Project**

1. Project name: `kudos-build`
2. Source: 
   - Provider: GitHub
   - Repository: Your kudos-board repo
   - Webhook: Check "Rebuild every time..."
3. Environment:
   - Managed image: Ubuntu
   - Runtime: Standard
   - Image: `aws/codebuild/standard:7.0`
   - Service role: `CodeBuildServiceRole`
4. Buildspec:
   - Source: Use a buildspec file
   - Buildspec name: `buildspec.yml`
5. Logs:
   - CloudWatch Logs: Enable
   - Log group: `/aws/codebuild/kudos-build`
6. Click "Create"

---

## PART 8: SETUP CODEPIPELINE (Automatic Deployment)

Go to: **AWS Console → CodePipeline → Create Pipeline**

### Pipeline Settings
1. Name: `kudos-pipeline`
2. Service role: `CodePipelineServiceRole`
3. Artifact store: Default
4. Click "Next"

### Stage 1: Source
1. Provider: GitHub (v2)
2. Connect GitHub: Click "Connect to GitHub"
   - Authorize AWS
   - Select repo: `kudos-board`
3. Branch: `main`
4. Click "Next"

### Stage 2: Build
1. Provider: AWS CodeBuild
2. Project name: `kudos-build`
3. Click "Next"

### Stage 3: Deploy
1. Provider: Amazon ECS
2. Cluster: `kudos-cluster`
3. Service: `kudos-service`
4. Image definitions file: `imagedefinitions.json`
5. Click "Next"

### Review & Create
Click "Create"

---

## PART 9: PUSH CODE TO GITHUB

```bash
# Initialize git
git init
git add .
git commit -m "Manual AWS deployment setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kudos-board.git
git push -u origin main
```

The pipeline will automatically trigger! Watch in AWS Console.

---

## PART 10: MONITOR THE DEPLOYMENT

Go to: **AWS Console → CodePipeline → kudos-pipeline**

Watch each stage:
1. **Source** - Pulls code from GitHub
2. **Build** - CodeBuild builds Docker images
3. **Deploy** - ECS updates service with new images

View logs:
```bash
# Build logs
aws logs tail /aws/codebuild/kudos-build --follow

# ECS logs
aws logs tail /ecs/kudos --follow
```

---

## NOW YOU UNDERSTAND!

You've done it completely manually:
✅ Created AWS resources manually via Console
✅ Built Docker images locally
✅ Pushed to ECR manually
✅ Created ECS task definition
✅ Deployed service
✅ Setup CI/CD pipeline
✅ Watched it deploy

**Now you understand every component!** 

Next time, you can:
- Use `setup-aws-resources.sh` instead of manual IAM/ECR/VPC
- Use `buildspec.yml` for automatic Docker building
- Use `task-definition.json` to automate task creation

But now you KNOW what each file does because you did it manually!

---

## TROUBLESHOOTING

### Tasks won't start?
```bash
aws ecs describe-tasks \
  --cluster kudos-cluster \
  --tasks <task-arn> \
  --query 'tasks[0].stoppedReason'
```

### Images not in ECR?
```bash
aws ecr describe-images --repository-name kudos-backend
```

### Can't access app?
```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn <arn>
```

### Pipeline failed?
```bash
# Check build logs
aws logs tail /aws/codebuild/kudos-build --follow
```

---

Needing help on any step? Let me know which part! 👊
