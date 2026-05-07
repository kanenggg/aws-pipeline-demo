import boto3, json, os, sys

bedrock = boto3.client('bedrock-runtime', region_name=os.environ['AWS_DEFAULT_REGION'])
build_log = sys.argv[1] if len(sys.argv) > 1 else "No log available"
build_id = os.environ.get('CODEBUILD_BUILD_ID', '')

prompt = (
    "You are a DevSecOps expert on AWS.\n"
    "Analyze this CodeBuild failure and respond in Thai language with:\n"
    "1. Root Cause\n"
    "2. Fix Steps\n"
    "3. Prevention\n\n"
    "Build ID: " + build_id + "\n\n"
    "Log:\n" + build_log
)

response = bedrock.invoke_model(
    modelId='amazon.nova-pro-v1:0',
    body=json.dumps({
        "messages": [{"role": "user", "content": prompt}],
        "inferenceConfig": {"maxTokens": 1000, "temperature": 0.3}
    })
)

result = json.loads(response['body'].read())
analysis = result['output']['message']['content'][0]['text']

with open('q-analysis.txt', 'w') as f:
    f.write(analysis)

print("=== Amazon Q Analysis ===")
print(analysis)