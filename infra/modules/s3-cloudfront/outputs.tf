output "bucket_name" {
  description = "Frontend S3 bucket name"
  value       = aws_s3_bucket.frontend.id
}

output "bucket_arn" {
  description = "Frontend S3 bucket ARN"
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID (for Route53)"
  value       = aws_cloudfront_distribution.frontend.hosted_zone_id
}

output "frontend_url" {
  description = "Frontend URL (CloudFront domain)"
  value       = length(var.domain_names) > 0 ? "https://${var.domain_names[0]}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}
