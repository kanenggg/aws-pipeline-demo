import boto3
import json
import os
import sys

bedrock        = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_DEFAULT_REGION', 'us-east-1'))
backend_image  = sys.argv[1] if len(sys.argv) > 1 else ""
frontend_image = sys.argv[2] if len(sys.argv) > 2 else ""
critical_count = sys.argv[3] if len(sys.argv) > 3 else "0"
high_count     = sys.argv[4] if len(sys.argv) > 4 else "0"
medium_count   = sys.argv[5] if len(sys.argv) > 5 else "0"
build_id       = os.environ.get('CODEBUILD_BUILD_ID', '')

# Load and deduplicate findings from inspector-raw.json
try:
    with open('inspector-raw.json') as f:
        data = json.load(f)

    findings = data.get('findings', [])
    seen, unique = set(), []
    for item in findings:
        cve = item.get('packageVulnerabilityDetails', {}).get('vulnerabilityId', '')
        sev = item.get('severity', '')
        key = f"{cve}-{sev}"
        if key not in seen:
            seen.add(key)
            pkg = item.get('packageVulnerabilityDetails', {}).get('vulnerablePackages', [{}])[0]
            unique.append({
                'severity':     sev,
                'cve':          cve,
                'title':        item.get('title', ''),
                'packageName':  pkg.get('name', ''),
                'fixedVersion': pkg.get('fixedInVersion', ''),
                'score':        item.get('inspectorScore', 0)
            })

    with open('inspector-findings.json', 'w') as f:
        json.dump(unique, f, indent=2)

    print(f"Raw findings: {len(findings)} → Unique: {len(unique)}")
    findings_summary = json.dumps(unique[:20], indent=2, ensure_ascii=False)[:6000]

except Exception as e:
    print(f"Warning: {e}")
    findings_summary = "Could not load inspector-raw.json"

prompt = f"""You are a DevSecOps expert on AWS Cloud Native.
Analyze the Amazon Inspector V2 container image scan results and respond in Thai language:

## Scan Summary
- Build ID:       {build_id}
- Backend Image:  {backend_image}
- Frontend Image: {frontend_image}
- Critical CVEs:  {critical_count}
- High CVEs:      {high_count}
- Medium CVEs:    {medium_count}

## Top Findings (JSON)
{findings_summary}

Please analyze and provide:
1. สรุปภาพรวมความเสี่ยงของ container images
2. CVE ที่อันตรายที่สุด 3-5 รายการ พร้อมอธิบายผลกระทบ
3. วิธีแก้ไข (base image upgrade, package update)
4. คำแนะนำ container hardening เพิ่มเติม
5. สรุปว่าควร deploy ต่อหรือไม่"""

try:
    response = bedrock.invoke_model(
        modelId='amazon.nova-pro-v1:0',
        body=json.dumps({
            "messages": [{"role": "user", "content": [{"text": prompt}]}],
            "inferenceConfig": {"maxTokens": 2000, "temperature": 0.3}
        })
    )
    result   = json.loads(response['body'].read())
    analysis = result['output']['message']['content'][0]['text']
except Exception as e:
    analysis = f"Error calling Bedrock: {e}"

with open('q-inspector-analysis.txt', 'w') as f:
    f.write(f"Build ID:       {build_id}\n")
    f.write(f"Backend Image:  {backend_image}\n")
    f.write(f"Frontend Image: {frontend_image}\n")
    f.write(f"Critical: {critical_count} | High: {high_count} | Medium: {medium_count}\n")
    f.write("=" * 60 + "\n")
    f.write(analysis)

print("=== Amazon Q Dev Inspector Analysis ===")
print(analysis)
