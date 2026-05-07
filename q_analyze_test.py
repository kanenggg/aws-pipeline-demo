import boto3, json, os, sys

bedrock          = boto3.client('bedrock-runtime', region_name=os.environ['AWS_DEFAULT_REGION'])
semgrep_findings = sys.argv[1] if len(sys.argv) > 1 else "No findings"
critical_count   = sys.argv[2] if len(sys.argv) > 2 else "0"
high_count       = sys.argv[3] if len(sys.argv) > 3 else "0"
build_id         = os.environ.get('CODEBUILD_BUILD_ID', '')

prompt = (
    "You are a DevSecOps expert on AWS Cloud Native.\n"
    "วิเคราะห์ผล Semgrep SAST และตอบเป็นภาษาไทย:\n\n"
    "## สรุปภาพรวม\n"
    "- Critical (ERROR): " + critical_count + "\n"
    "- High (WARNING):   " + high_count + "\n\n"
    "## วิเคราะห์แต่ละ Finding\n"
    "(อธิบายแต่ละ rule ว่าคืออะไร ทำไมถึงอันตราย)\n\n"
    "## ขั้นตอนแก้ไข\n"
    "(บอกวิธีแก้เป็น step ที่ชัดเจน)\n\n"
    "## การป้องกันระยะยาว\n"
    "(best practice สำหรับ Cloud Native AWS)\n\n"
    "Build ID: " + build_id + "\n\n"
    "=== Semgrep Findings ===\n" + semgrep_findings
)

response = bedrock.invoke_model(
    modelId='amazon.nova-pro-v1:0',
    body=json.dumps({
        "messages": [{"role": "user", "content": prompt}],
        "inferenceConfig": {"maxTokens": 2000, "temperature": 0.3}
    })
)

result   = json.loads(response['body'].read())
analysis = result['output']['message']['content'][0]['text']

with open('q-analysis.txt', 'w') as f:
    f.write("Build ID: " + build_id + "\n")
    f.write("Critical: " + critical_count + " | High: " + high_count + "\n")
    f.write("="*60 + "\n")
    f.write(analysis)

print(analysis)