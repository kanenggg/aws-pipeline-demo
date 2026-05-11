import boto3
import json
import os
import sys

# ── Config ───────────────────────────────────────────────────────────────────

region         = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
backend_image  = sys.argv[1] if len(sys.argv) > 1 else ""
frontend_image = sys.argv[2] if len(sys.argv) > 2 else ""
build_id       = os.environ.get('CODEBUILD_BUILD_ID', '')
ecs_cluster    = os.environ.get('ECS_CLUSTER',            'ploclo-cms-cluster')
svc_backend    = os.environ.get('ECS_SERVICE_BACKEND',    'ploclo-backend')
svc_frontend   = os.environ.get('ECS_SERVICE_FRONTEND',   'ploclo-frontend')

ecs     = boto3.client('ecs',             region_name=region)
bedrock = boto3.client('bedrock-runtime', region_name=region)

REMOVE_KEYS = [
    'taskDefinitionArn', 'revision', 'status',
    'requiresAttributes', 'compatibilities', 'registeredAt', 'registeredBy'
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def update_task_def(cluster, service, container_name, new_image):
    task_def_arn = ecs.describe_services(
        cluster=cluster, services=[service]
    )['services'][0]['taskDefinition']

    td = ecs.describe_task_definition(taskDefinition=task_def_arn)['taskDefinition']

    for c in td['containerDefinitions']:
        if c['name'] == container_name:
            c['image'] = new_image

    for key in REMOVE_KEYS:
        td.pop(key, None)

    new_arn = ecs.register_task_definition(**td)['taskDefinition']['taskDefinitionArn']
    print(f"  {container_name}: {task_def_arn.split('/')[-1]} → {new_arn.split('/')[-1]}")
    return new_arn

def deploy_service(cluster, service, task_def_arn):
    ecs.update_service(
        cluster=cluster,
        service=service,
        taskDefinition=task_def_arn,
        forceNewDeployment=True
    )
    print(f"  {service} → deploying")

def wait_stable(cluster, services):
    print(f"  Waiting for services to stabilize...")
    waiter = ecs.get_waiter('services_stable')
    waiter.wait(
        cluster=cluster,
        services=services,
        WaiterConfig={'Delay': 15, 'MaxAttempts': 40}
    )
    print(f"  All services stable")

def get_running_count(cluster, service):
    res = ecs.describe_services(cluster=cluster, services=[service])
    return res['services'][0].get('runningCount', 0)

# ── Deploy ────────────────────────────────────────────────────────────────────

print("[1/3] Updating task definitions...")
backend_task  = update_task_def(ecs_cluster, svc_backend,  'ploclo-cms-backend',  backend_image)
frontend_task = update_task_def(ecs_cluster, svc_frontend, 'ploclo-cms-frontend', frontend_image)

print("[2/3] Deploying services...")
deploy_service(ecs_cluster, svc_backend,  backend_task)
deploy_service(ecs_cluster, svc_frontend, frontend_task)

print("[3/3] Waiting for deployment to stabilize...")
wait_stable(ecs_cluster, [svc_backend, svc_frontend])

backend_running  = get_running_count(ecs_cluster, svc_backend)
frontend_running = get_running_count(ecs_cluster, svc_frontend)
deploy_status    = "SUCCEEDED" if backend_running > 0 and frontend_running > 0 else "FAILED"

print(f"  Backend:  {backend_running} running")
print(f"  Frontend: {frontend_running} running")

# ── Amazon Q Dev Analysis ─────────────────────────────────────────────────────

success = deploy_status == "SUCCEEDED"
prompt = f"""คุณคือผู้เชี่ยวชาญด้าน DevSecOps บน AWS
วิเคราะห์ผลการ Deploy ขึ้น ECS Fargate และอธิบายเป็นภาษาไทยที่เข้าใจง่าย

## ข้อมูล Deployment
- Build ID:       {build_id}
- Cluster:        {ecs_cluster}
- Status:         {deploy_status}
- Backend Image:  {backend_image}
- Frontend Image: {frontend_image}
- Backend Tasks:  {backend_running} running
- Frontend Tasks: {frontend_running} running

กรุณาวิเคราะห์และตอบในรูปแบบนี้:

🚀 สรุปผลการ Deploy
- บอกว่า deploy สำเร็จหรือไม่ และ container กี่ตัวที่รันอยู่

{"✅ Deploy สำเร็จ — ตรวจสอบสิ่งเหล่านี้:" if success else "❌ Deploy ล้มเหลว — วิเคราะห์สาเหตุ:"}
{"1. ตรวจสอบ Health check ของ container" if success else "1. สาเหตุที่เป็นไปได้"}
{"2. ตรวจสอบ CloudWatch Logs" if success else "2. วิธีแก้ไขทีละขั้นตอน"}
{"3. ทดสอบ endpoint หลัก" if success else "3. วิธีป้องกันในครั้งต่อไป"}

🛡️ Security Reminder
- สิ่งที่ควรตรวจสอบหลัง deploy (Security Group, Secrets, Logs)

✅ สรุป: ระบบพร้อมใช้งานหรือไม่?"""

try:
    response = bedrock.invoke_model(
        modelId='amazon.nova-pro-v1:0',
        body=json.dumps({
            "messages": [{"role": "user", "content": [{"text": prompt}]}],
            "inferenceConfig": {"maxTokens": 1500, "temperature": 0.3}
        })
    )
    result   = json.loads(response['body'].read())
    analysis = result['output']['message']['content'][0]['text']
except Exception as e:
    analysis = f"Error calling Bedrock: {e}"

with open('q-deploy-analysis.txt', 'w') as f:
    f.write(f"Build ID:        {build_id}\n")
    f.write(f"Cluster:         {ecs_cluster}\n")
    f.write(f"Status:          {deploy_status}\n")
    f.write(f"Backend Image:   {backend_image}\n")
    f.write(f"Frontend Image:  {frontend_image}\n")
    f.write(f"Backend Tasks:   {backend_running} running\n")
    f.write(f"Frontend Tasks:  {frontend_running} running\n")
    f.write("=" * 60 + "\n")
    f.write(analysis)

print("=== Amazon Q Dev Deploy Analysis ===")
print(analysis)
