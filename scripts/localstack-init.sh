#!/bin/bash
# LocalStack initialization script
# This runs automatically when LocalStack is ready.

set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
BUCKET="${S3_BUCKET_ATTACHMENTS:-acr-attachments-dev}"
SES_EMAIL="${SES_FROM_EMAIL:-no-reply@dits.co.th}"

echo "Initializing LocalStack services..."

# Create S3 bucket for attachments
echo "Creating S3 bucket: $BUCKET"
awslocal s3 mb "s3://$BUCKET" --region "$REGION" 2>/dev/null || true

# Configure bucket CORS for presigned URL uploads
awslocal s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:5173"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}'

# Verify SES email identity
echo "Verifying SES email identity: $SES_EMAIL"
awslocal ses verify-email-identity --email-address "$SES_EMAIL" --region "$REGION" 2>/dev/null || true

echo "LocalStack initialization complete."
