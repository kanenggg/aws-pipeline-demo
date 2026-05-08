import boto3, json, os, sys

bedrock        = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_DEFAULT_REGION', 'us-east-1'))
backend_image  = sys.argv[1] if len(sys.argv) > 1 else ""
frontend_image = sys.argv[2] if len(sys.argv) > 2 else ""
critical_count = sys.argv[3] if len(sys.argv) > 3 else "0"
high_count     = sys.argv[4] if len(sys.argv) > 4 else "0"
medium_count   = sys.argv[5] if len(sys.argv) > 5 else "0"
build_id       = os.environ.get('CODEBUILD_BUILD_ID', '')

try:
    with open('inspector-findings.json') as f:
        findings = json.loads(f.read())
    top_findings     = findings[:20]
    findings_summary = json.dumps(top_findings, indent=2, ensure_ascii=False)[:6000]
except Exception:
    findings_summary = "Could not load inspector-findings.json"

prompt = (
    "You are a DevSecOps expert on AWS Cloud Native.\n"
    "Analyze the Amazon Inspector V2 container image scan results and respond in Thai language:\n\n"
    "## Scan Summary\n"
    "- Build ID:       " + build_id + "\n"
    "- Backend Image:  " + backend_image + "\n"
    "- Frontend Image: " + frontend_image + "\n"
    "- Critical CVEs:  " + critical_count + "\n"
    "- High CVEs:      " + high_count + "\n"
    "- Medium CVEs:    " + medium_count + "\n\n"
    "## Top Findings (JSON)\n"
    + findings_summary + "\n\n"
    "Please analyze and provide:\n"
    "1. สรุปภาพรวมความเสี่ยงของ container images\n"
    "2. CVE ที่อันตรายที่สุด 3-5 รายการ พร้อมอธิบายผลกระทบ\n"
    "3. วิธีแก้ไข (base image upgrade, package update)\n"
    "4. คำแนะนำ container hardening เพิ่มเติม\n"
    "5. สรุปว่าควร deploy ต่อหรือไม่"
)

try:
    response = bedrock.invoke_model(
        modelId='amazon.nova-pro-v1:0',
        body=json.dumps({
            "messages": [{"role": "user", "content": [{"text": prompt}]}],
            "inferenceConfig": {"maxTokens": 2000, "temperature": 0.3, "stopSequences": []}
        }),
        accept='application/json',
        contentType='application/json'
    )
    result   = json.loads(response['body'].read())
    analysis = result['output']['message']['content'][0]['text']
except Exception as e:
    analysis = f"Error calling Bedrock: {e}"

with open('q-inspector-analysis.txt', 'w') as f:
    f.write("Build ID:      " + build_id + "\n")
    f.write("Backend Image: " + backend_image + "\n")
    f.write("Frontend Image:" + frontend_image + "\n")
    f.write(f"Critical: {critical_count} | High: {high_count} | Medium: {medium_count}\n")
    f.write("=" * 60 + "\n")
    f.write(analysis)

print("=== Amazon Q Dev Inspector Analysis ===")
print(analysis)
