# ==============================================================
# AWS Infrastructure Setup for PLOCLO CMS - DevSecOps Demo
# รันทีละ section ตามลำดับ
# ==============================================================

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"
APP_NAME="ploclo-cms"

echo "Account: $AWS_ACCOUNT_ID | Region: $AWS_REGION"

# ==============================================================
# 1. ECS CLUSTER
# ==============================================================
aws ecs create-cluster \
  --cluster-name $APP_NAME-cluster \
  --capacity-providers FARGATE \
  --region $AWS_REGION

echo "✓ ECS Cluster created"

# ==============================================================
# 2. CLOUDWATCH LOG GROUPS
# ==============================================================
aws logs create-log-group --log-group-name /ecs/$APP_NAME-backend  --region $AWS_REGION
aws logs create-log-group --log-group-name /ecs/$APP_NAME-frontend --region $AWS_REGION

echo "✓ CloudWatch Log Groups created"

# ==============================================================
# 3. IAM - ECS Task Execution Role
# ==============================================================
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

echo "✓ ECS Task Execution Role created"

# ==============================================================
# 4. IAM - CodeDeploy Role
# ==============================================================
aws iam create-role \
  --role-name CodeDeployECSRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "codedeploy.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name CodeDeployECSRole \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS

echo "✓ CodeDeploy Role created"

# ==============================================================
# 5. IAM - CodeBuild Deploy Role
# ==============================================================
aws iam create-role \
  --role-name codebuild-deploy-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "codebuild.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy \
  --role-name codebuild-deploy-role \
  --policy-name DeployPermissions \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "iam:PassRole",
        "bedrock:InvokeModel",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "*"
    }]
  }'

echo "✓ CodeBuild Deploy Role created"

# ==============================================================
# 6. TASK DEFINITIONS
# !! แก้ SUBNET, SECURITY GROUP, RDS ENDPOINT ก่อนรัน
# ==============================================================
RDS_ENDPOINT="<rds-endpoint>"   # แก้ตรงนี้
JWT_SECRET="<jwt-secret>"       # แก้ตรงนี้

# Backend Task Definition
cat > /tmp/taskdef-backend.json << EOF
{
  "family": "$APP_NAME-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "backend",
    "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME:backend-latest",
    "portMappings": [{"containerPort": 3001, "protocol": "tcp"}],
    "environment": [
      {"name": "NODE_ENV",      "value": "production"},
      {"name": "DATABASE_URL",  "value": "postgresql://postgres:admin123@$RDS_ENDPOINT:5432/myapp"},
      {"name": "JWT_SECRET",    "value": "$JWT_SECRET"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group":         "/ecs/$APP_NAME-backend",
        "awslogs-region":        "$AWS_REGION",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command":     ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
      "interval":    30,
      "timeout":     5,
      "retries":     3,
      "startPeriod": 60
    }
  }]
}
EOF

# Frontend Task Definition
cat > /tmp/taskdef-frontend.json << EOF
{
  "family": "$APP_NAME-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "frontend",
    "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME:frontend-latest",
    "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
    "environment": [
      {"name": "NODE_ENV",             "value": "production"},
      {"name": "NEXT_PUBLIC_API_URL",  "value": "http://<alb-dns>/api"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group":         "/ecs/$APP_NAME-frontend",
        "awslogs-region":        "$AWS_REGION",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/taskdef-backend.json
aws ecs register-task-definition --cli-input-json file:///tmp/taskdef-frontend.json

echo "✓ Task Definitions registered"

# ==============================================================
# 7. ECS SERVICES (Blue/Green ต้องใช้ CODE_DEPLOY controller)
# !! แก้ SUBNET_1, SUBNET_2, SG_ECS, TG_BACKEND_ARN ก่อนรัน
# ==============================================================
SUBNET_1="<subnet-private-1>"     # แก้ตรงนี้
SUBNET_2="<subnet-private-2>"     # แก้ตรงนี้
SG_ECS="<sg-ecs>"                 # แก้ตรงนี้
TG_BACKEND_BLUE_ARN="<tg-arn>"    # แก้ตรงนี้
TG_FRONTEND_BLUE_ARN="<tg-arn>"   # แก้ตรงนี้

aws ecs create-service \
  --cluster $APP_NAME-cluster \
  --service-name $APP_NAME-backend \
  --task-definition $APP_NAME-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --deployment-controller type=CODE_DEPLOY \
  --network-configuration "awsvpcConfiguration={
    subnets=[$SUBNET_1,$SUBNET_2],
    securityGroups=[$SG_ECS],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=$TG_BACKEND_BLUE_ARN,containerName=backend,containerPort=3001"

aws ecs create-service \
  --cluster $APP_NAME-cluster \
  --service-name $APP_NAME-frontend \
  --task-definition $APP_NAME-frontend \
  --desired-count 1 \
  --launch-type FARGATE \
  --deployment-controller type=CODE_DEPLOY \
  --network-configuration "awsvpcConfiguration={
    subnets=[$SUBNET_1,$SUBNET_2],
    securityGroups=[$SG_ECS],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=$TG_FRONTEND_BLUE_ARN,containerName=frontend,containerPort=3000"

echo "✓ ECS Services created"

# ==============================================================
# 8. CODEDEPLOY APPLICATION + DEPLOYMENT GROUP
# ==============================================================
aws deploy create-application \
  --application-name $APP_NAME \
  --compute-platform ECS

aws deploy create-deployment-group \
  --application-name $APP_NAME \
  --deployment-group-name $APP_NAME-dg \
  --deployment-config-name CodeDeployDefault.ECSAllAtOnce \
  --service-role-arn arn:aws:iam::$AWS_ACCOUNT_ID:role/CodeDeployECSRole \
  --ecs-services clusterName=$APP_NAME-cluster,serviceName=$APP_NAME-backend \
  --load-balancer-info "targetGroupPairInfoList=[{
    targetGroups=[
      {name=$APP_NAME-backend-blue},
      {name=$APP_NAME-backend-green}
    ],
    prodTrafficRoute={listenerArns=[<alb-listener-arn>]}
  }]" \
  --blue-green-deployment-configuration "
    terminateBlueInstancesOnDeploymentSuccess={
      action=TERMINATE,
      terminationWaitTimeInMinutes=60
    },
    deploymentReadyOption={
      actionOnTimeout=CONTINUE_DEPLOYMENT
    }"

echo "✓ CodeDeploy Application + Deployment Group created"

# ==============================================================
# 9. CODEBUILD PROJECT (Deploy stage)
# ==============================================================
aws codebuild create-project \
  --name aws-pipelineDeploy-demo \
  --source type=CODEPIPELINE,buildspec=buildspec-deploy.yml \
  --artifacts type=CODEPIPELINE \
  --environment "type=LINUX_CONTAINER,
    computeType=BUILD_GENERAL1_SMALL,
    image=aws/codebuild/standard:7.0,
    environmentVariables=[
      {name=ECS_CLUSTER,value=$APP_NAME-cluster},
      {name=ECS_SERVICE_BACKEND,value=$APP_NAME-backend},
      {name=ECS_SERVICE_FRONTEND,value=$APP_NAME-frontend},
      {name=IMAGE_REPO_NAME,value=$APP_NAME},
      {name=AWS_DEFAULT_REGION,value=$AWS_REGION}
    ]" \
  --service-role arn:aws:iam::$AWS_ACCOUNT_ID:role/codebuild-deploy-role

echo "✓ CodeBuild Deploy project created"
echo ""
echo "================================================"
echo "Setup complete!"
echo "ขั้นตอนต่อไป:"
echo "1. สร้าง VPC + Subnet + Security Group ใน Console"
echo "2. สร้าง RDS PostgreSQL ใน Console"
echo "3. สร้าง ALB + Target Groups (Blue/Green) ใน Console"
echo "4. แก้ค่า <placeholder> ในไฟล์นี้แล้วรันใหม่"
echo "5. เพิ่ม Deploy stage ใน CodePipeline"
echo "================================================"
