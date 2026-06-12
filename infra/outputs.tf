# =============================================================================
# Root Outputs — ACR Management System
# =============================================================================

# --- Networking ---
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

# --- ECS / Backend ---
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "backend_alb_dns" {
  description = "Backend ALB DNS name"
  value       = module.ecs.alb_dns_name
}

# --- RDS ---
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
}

# --- ElastiCache ---
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.redis_endpoint
}

# --- Frontend ---
output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = module.s3_cloudfront.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for invalidation)"
  value       = module.s3_cloudfront.cloudfront_distribution_id
}

output "frontend_bucket_name" {
  description = "Frontend S3 bucket name"
  value       = module.s3_cloudfront.bucket_name
}

# --- Attachments ---
output "attachments_bucket_name" {
  description = "Attachments S3 bucket name"
  value       = module.s3_attachments.bucket_name
}

# --- SES ---
output "ses_domain_identity_arn" {
  description = "SES domain identity ARN"
  value       = module.ses.domain_identity_arn
}

output "ses_dkim_tokens" {
  description = "SES DKIM tokens for DNS"
  value       = module.ses.dkim_tokens
}
