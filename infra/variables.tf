# =============================================================================
# Root Variables — ACR Management System
# =============================================================================

# --- General ---
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "acr"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-southeast-1"
}

# --- Networking ---
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "container_port" {
  description = "Port the backend container listens on"
  type        = number
  default     = 3000
}

# --- RDS ---
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = false
}

variable "rds_backup_retention_period" {
  description = "RDS backup retention in days"
  type        = number
  default     = 7
}

variable "rds_deletion_protection" {
  description = "Enable RDS deletion protection"
  type        = bool
  default     = true
}

variable "rds_skip_final_snapshot" {
  description = "Skip final snapshot on RDS deletion"
  type        = bool
  default     = false
}

variable "rds_performance_insights_enabled" {
  description = "Enable RDS Performance Insights"
  type        = bool
  default     = false
}

# --- ElastiCache / Redis ---
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_clusters" {
  description = "Number of Redis cache clusters"
  type        = number
  default     = 1
}

variable "redis_snapshot_retention_limit" {
  description = "Redis snapshot retention in days"
  type        = number
  default     = 1
}

# --- ECS ---
variable "container_image" {
  description = "Docker image URI for the backend"
  type        = string
}

variable "ecs_task_cpu" {
  description = "Fargate task CPU units"
  type        = number
  default     = 512
}

variable "ecs_task_memory" {
  description = "Fargate task memory in MB"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Number of ECS tasks"
  type        = number
  default     = 1
}

variable "backend_certificate_arn" {
  description = "ACM certificate ARN for backend ALB (HTTPS)"
  type        = string
}

variable "jwt_secret_arn" {
  description = "ARN of JWT secret in Secrets Manager"
  type        = string
}

variable "ecs_enable_container_insights" {
  description = "Enable ECS Container Insights"
  type        = bool
  default     = false
}

variable "ecs_log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# --- S3 + CloudFront (Frontend) ---
variable "frontend_domain_names" {
  description = "Custom domain names for CloudFront frontend"
  type        = list(string)
  default     = []
}

variable "frontend_certificate_arn" {
  description = "ACM certificate ARN for CloudFront (must be in us-east-1)"
  type        = string
  default     = ""
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_200"
}

# --- S3 Attachments ---
variable "cors_allowed_origins" {
  description = "CORS allowed origins for attachments bucket"
  type        = list(string)
  default     = ["*"]
}

# --- SES ---
variable "ses_domain" {
  description = "Domain for SES email identity"
  type        = string
}

variable "ses_from_email" {
  description = "Sender email address"
  type        = string
}

variable "ses_route53_zone_id" {
  description = "Route53 zone ID for SES DNS verification (optional)"
  type        = string
  default     = ""
}
