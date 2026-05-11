import boto3
import json
import os
import sys

# ── Config ───────────────────────────────────────────────────────────────────

region         = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
backend_image  = sys.argv[1] if len(sys.argv) > 1 else ""
frontend_image = sys.argv[2] if len(sys.argv) > 2 else ""
build_id       = os.environ.get('CODEBUILD_BUILD_ID', '')
svc_backend    = os.environ.get('APPRUNNER_SERVICE_BACKEND',  'ploclo-cms-backend')
svc_frontend   = os.environ.get('APPRUNNER_SERVICE_FRONTEND', 'ploclo-cms-frontend')

apprunner = boto3.client('apprunner',       region_name=region)
bedrock   = boto3.client('bedrock-runtime', region_name=region)

# ── Deploy to App Runner ──────────────────────────────────────────────────────

def get_service_arn(service_name):
    res = apprunner.list_services()
    for svc in res.get('ServiceSummaryList', []):
        if svc['ServiceName'] == service_name:
            return svc['ServiceArn']
    raise Exception(f"App Runner service '{service_name}' not found")

def deploy(service_name, image_uri):
    arn = get_service_arn(service_name)
    apprunner.update_service(
        ServiceArn=arn,
        SourceConfiguration={
            'ImageRepository': {
                'ImageIdentifier':     image_uri,
                'ImageRepositoryType': 'ECR'
            }
        }
    )
    print(f"  {service_name} → deploying {image_uri}")
    return arn

def wait_running(service_name, arn):
    waiter = apprunner.get_waiter('service_running')
    waiter.wait(ServiceArn=arn, WaiterConfig={'Delay': 15, 'MaxAttempts': 40})
    svc = apprunner.describe_service(ServiceArn=arn)['Service']
    print(f"  {service_name} → {svc['Status']} | URL: https://{svc['ServiceUrl']}")
    return svc

print("[1/2] Deploying to App Runner...")
backend_arn  = deploy(svc_backend,  backend_image)
frontend_arn = deploy(svc_frontend, frontend_image)

print("[2/2] Waiting for services to be running...")
backend_svc  = wait_running(svc_backend,  backend_arn)
frontend_svc = wait_running(svc_frontend, frontend_arn)

backend_url  = backend_svc.get('ServiceUrl',  '')
frontend_url = frontend_svc.get('ServiceUrl', '')
deploy_status = "SUCCEEDED" if backend_svc['Status'] == 'RUNNING' and frontend_svc['Status'] == 'RUNNING' else "FAILED"

# ── Amazon Q Dev Analysis ─────────────────────────────────────────────────────

prompt = f"""คุณคือผู้เชี่ยวชาญด้าน DevSecOps บน AWS
วิเคราะห์ผลการ Deploy ขึ้น AWS App Runner และอธิบายเป็นภาษาไทยที่เข้าใจง่าย

## ข้อมูล Deployment
- Build ID:       {build_id}
- Status:         {deploy_status}
- Backend Image:  {backend_image}
- Frontend Image: {frontend_image}
- Backend URL:    https://{backend_url}
- Frontend URL:   https://{frontend_url}

กรุณาวิเคราะห์และตอบในรูปแบบนี้:

🚀 สรุปผลการ Deploy
- บอกว่า deploy สำเร็จหรือไม่ และ URL ที่ใช้งานได้

{"✅ Deploy สำเร็จ — ตรวจสอบสิ่งเหล่านี้:" if deploy_status == "SUCCEEDED" else "❌ Deploy ล้มเหลว — วิเคราะห์สาเหตุ:"}
{"1. ทดสอบ Backend URL: https://" + backend_url if deploy_status == "SUCCEEDED" else "1. สาเหตุที่เป็นไปได้"}
{"2. ทดสอบ Frontend URL: https://" + frontend_url if deploy_status == "SUCCEEDED" else "2. วิธีแก้ไขทีละขั้นตอน"}
{"3. ตรวจสอบ CloudWatch Logs ของ App Runner" if deploy_status == "SUCCEEDED" else "3. วิธีป้องกันในครั้งต่อไป"}

🛡️ Security Reminder
- สิ่งที่ควรตรวจสอบหลัง deploy (Secrets, Logs, Auto Scaling)

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
    f.write(f"Build ID:       {build_id}\n")
    f.write(f"Status:         {deploy_status}\n")
    f.write(f"Backend Image:  {backend_image}\n")
    f.write(f"Frontend Image: {frontend_image}\n")
    f.write(f"Backend URL:    https://{backend_url}\n")
    f.write(f"Frontend URL:   https://{frontend_url}\n")
    f.write("=" * 60 + "\n")
    f.write(analysis)

print("=== Amazon Q Dev Deploy Analysis ===")
print(analysis)
