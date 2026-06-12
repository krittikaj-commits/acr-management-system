# =============================================================================
# Production Environment — terraform.tfvars
# =============================================================================
# Production-grade instances, high availability, security hardened

# --- General ---
project_name = "acr"
environment  = "production"
aws_region   = "ap-southeast-1"

# --- Networking ---
vpc_cidr       = "10.0.0.0/16"
container_port = 3000

# --- RDS (MSSQL Express) ---
rds_instance_class               = "db.t3.small"
rds_allocated_storage            = 50
rds_max_allocated_storage        = 200
rds_multi_az                     = true
rds_backup_retention_period      = 14
rds_deletion_protection          = true
rds_skip_final_snapshot          = false
rds_performance_insights_enabled = true

# --- ElastiCache (Redis) ---
redis_node_type              = "cache.t3.micro"
redis_num_cache_clusters     = 2
redis_snapshot_retention_limit = 7

# --- ECS (Fargate) ---
container_image               = "PLACEHOLDER:latest"
ecs_task_cpu                  = 512
ecs_task_memory               = 1024
ecs_desired_count             = 2
ecs_enable_container_insights = true
ecs_log_retention_days        = 90

# --- S3 + CloudFront (Frontend) ---
frontend_domain_names    = ["acr.dits.co.th"]
frontend_certificate_arn = ""
cloudfront_price_class   = "PriceClass_200"

# --- S3 Attachments ---
cors_allowed_origins = ["https://acr.dits.co.th"]

# --- SES ---
ses_domain          = "dits.co.th"
ses_from_email      = "no-reply@dits.co.th"
ses_route53_zone_id = ""

# --- Secrets (provide via -var or environment variables) ---
# db_username             = "acr_admin"
# db_password             = "<from-secrets>"
# backend_certificate_arn = "<from-acm>"
# jwt_secret_arn          = "<from-secrets-manager>"
