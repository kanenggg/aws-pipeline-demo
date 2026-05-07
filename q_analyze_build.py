import boto3, json, os, sys, datetime

bedrock      = boto3.client('bedrock-runtime', region_name=os.environ['AWS_DEFAULT_REGION'])
build_status = sys.argv[1] if len(sys.argv) > 1 else "UNKNOWN"
build_log    = sys.argv[2] if len(sys.argv) > 2 else "No log available"
build_id     = os.environ.get('CODEBUILD_BUILD_ID', '')
image_repo   = os.environ.get('IMAGE_REPO_NAME', '')

prompt = (
    "You are a DevSecOps expert on AWS Cloud Native.\n"
    "วิเคราะห์ผล Docker Build และ ECR Push แล้วตอบเป็นภาษาไทย:\n\n"
    "## สถานะ Build\n"
    "- Build ID: " + build_id + "\n"
    "- Status:   " + build_status + "\n"
    "- ECR Repo: " + image_repo + "\n\n"
    "ถ้า Status = SUCCEEDED ให้สรุป:\n"
    "1. สิ่งที่ build สำเร็จ\n"
    "2. Image ที่ push ขึ้น ECR\n"
    "3. ข้อแนะนำ best practice สำหรับ container security\n\n"
    "ถ้า Status = FAILED ให้วิเคราะห์:\n"
    "1. สาเหตุที่ build fail\n"
    "2. ขั้นตอนแก้ไข\n"
    "3. การป้องกัน\n\n"
    "=== Build Log ===\n" + build_log
)

response = bedrock.invoke_model(
    modelId='amazon.nova-pro-v1:0',
    body=json.dumps({
        "messages": [{"role": "user", "content": prompt}],
        "inferenceConfig": {"maxTokens": 1500, "temperature": 0.3}
    })
)

result   = json.loads(response['body'].read())
analysis = result['output']['message']['content'][0]['text']

output = {
    "timestamp":    datetime.datetime.utcnow().isoformat(),
    "build_id":     build_id,
    "build_status": build_status,
    "ecr_repo":     image_repo,
    "analysis":     analysis
}

with open('q-build-analysis.txt', 'w') as f:
    f.write("Build ID: " + build_id + "\n")
    f.write("Status:   " + build_status + "\n")
    f.write("="*60 + "\n")
    f.write(analysis)

print("=== Amazon Q Dev Build Analysis ===")
print(analysis)