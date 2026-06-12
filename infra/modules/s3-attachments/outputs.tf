output "bucket_name" {
  description = "Attachments S3 bucket name"
  value       = aws_s3_bucket.attachments.id
}

output "bucket_arn" {
  description = "Attachments S3 bucket ARN"
  value       = aws_s3_bucket.attachments.arn
}

output "bucket_domain_name" {
  description = "Attachments S3 bucket regional domain"
  value       = aws_s3_bucket.attachments.bucket_regional_domain_name
}
