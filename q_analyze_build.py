import boto3
import json
import os
import sys

bedrock        = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_DEFAULT_REGION', 'us-east-1'))
build_status   = sys.argv[1] if len(sys.argv) > 1 else "UNKNOWN"
build_log      = (sys.argv[2] if len(sys.argv) > 2 else "No log available")[:8000]
backend_image  = sys.argv[3] if len(sys.argv) > 3 else ""
frontend_image = sys.argv[4] if len(sys.argv) > 4 else ""
build_id       = os.environ.get('CODEBUILD_BUILD_ID', '')

prompt = f"""You are a DevSecOps expert on AWS Cloud Native.
Analyze the Docker Build and ECR Push result and respond in Thai language:

## Build Status
- Build ID:       {build_id}
- Status:         {build_status}
- Backend Image:  {backend_image}
- Frontend Image: {frontend_image}

If Status = SUCCEEDED summarize:
1. What was built successfully
2. Images pushed to ECR
3. Container security best practice recommendations

If Status = FAILED analyze:
1. Root cause
2. Fix steps
3. Prevention

=== Build Log ===
{build_log}"""

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

with open('q-build-analysis.txt', 'w') as f:
    f.write(f"Build ID: {build_id}\n")
    f.write(f"Status:   {build_status}\n")
    f.write("=" * 60 + "\n")
    f.write(analysis)

print("=== Amazon Q Dev Build Analysis ===")
print(analysis)
