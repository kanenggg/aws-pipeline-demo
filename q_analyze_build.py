import boto3, json, os, sys

bedrock       = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_DEFAULT_REGION', 'us-east-1'))
build_status  = sys.argv[1] if len(sys.argv) > 1 else "UNKNOWN"
build_log     = (sys.argv[2] if len(sys.argv) > 2 else "No log available")[:8000]
backend_image = sys.argv[3] if len(sys.argv) > 3 else ""
frontend_image= sys.argv[4] if len(sys.argv) > 4 else ""
build_id      = os.environ.get('CODEBUILD_BUILD_ID', '')

prompt = (
    "You are a DevSecOps expert on AWS Cloud Native.\n"
    "Analyze the Docker Build and ECR Push result and respond in Thai language:\n\n"
    "## Build Status\n"
    "- Build ID:       " + build_id + "\n"
    "- Status:         " + build_status + "\n"
    "- Backend Image:  " + backend_image + "\n"
    "- Frontend Image: " + frontend_image + "\n\n"
    "If Status = SUCCEEDED summarize:\n"
    "1. What was built successfully\n"
    "2. Images pushed to ECR\n"
    "3. Container security best practice recommendations\n\n"
    "If Status = FAILED analyze:\n"
    "1. Root cause\n"
    "2. Fix steps\n"
    "3. Prevention\n\n"
    "=== Build Log ===\n" + build_log
)

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
    f.write("Build ID: " + build_id + "\n")
    f.write("Status:   " + build_status + "\n")
    f.write("="*60 + "\n")
    f.write(analysis)

print("=== Amazon Q Dev Build Analysis ===")
print(analysis)