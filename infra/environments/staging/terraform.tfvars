# =============================================================================
# Staging Environment — terraform.tfvars
# =============================================================================
# Smaller instances, dev-friendly settings, cost-optimized

# --- General ---
project_name = "acr"
environment  = "staging"
aws_region   = "ap-southeast-1"

# --- Networking ---
vpc_cidr       = "10.0.0.0/16"
container_port = 3000

# --- RDS (MSSQL Express) ---
rds_instance_class               = "db.t3.small"
rds_allocated_storage            = 20
rds_max_allocated_storage        = 50
rds_multi_az                     = false
rds_backup_retention_period      = 3
rds_deletion_protection          = false
rds_skip_final_snapshot          = true
rds_performance_insights_enabled = false

# --- ElastiCache (Redis) ---
redis_node_type              = "cache.t3.micro"
redis_num_cache_clusters     = 1
redis_snapshot_retention_limit = 1

# --- ECS (Fargate) ---
container_image               = "PLACEHOLDER:latest"
ecs_task_cpu                  = 256
ecs_task_memory               = 512
ecs_desired_count             = 1
ecs_enable_container_insights = false
ecs_log_retention_days        = 14

# --- S3 + CloudFront (Frontend) ---
frontend_domain_names    = []
frontend_certificate_arn = ""
cloudfront_price_class   = "PriceClass_100"

# --- S3 Attachments ---
cors_allowed_origins = ["*"]

# --- SES ---
ses_domain          = "staging.dits.co.th"
ses_from_email      = "no-reply@staging.dits.co.th"
ses_route53_zone_id = ""

# --- Secrets (provide via -var or environment variables) ---
# db_username             = "sa"
# db_password             = "<from-secrets>"
# backend_certificate_arn = "<from-acm>"
# jwt_secret_arn          = "<from-secrets-manager>"
