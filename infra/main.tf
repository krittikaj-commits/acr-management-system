# =============================================================================
# Root Configuration — ACR Management System Infrastructure
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Configure via backend.hcl per environment
    # bucket         = "acr-terraform-state"
    # key            = "acr/terraform.tfstate"
    # region         = "ap-southeast-1"
    # dynamodb_table = "terraform-locks"
    # encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# =============================================================================
# Networking
# =============================================================================
module "networking" {
  source = "./modules/networking"

  project_name   = var.project_name
  environment    = var.environment
  vpc_cidr       = var.vpc_cidr
  container_port = var.container_port
}

# =============================================================================
# S3 — Attachments Bucket
# =============================================================================
module "s3_attachments" {
  source = "./modules/s3-attachments"

  project_name    = var.project_name
  environment     = var.environment
  allowed_origins = var.cors_allowed_origins
}

# =============================================================================
# S3 + CloudFront — Frontend Static Hosting
# =============================================================================
module "s3_cloudfront" {
  source = "./modules/s3-cloudfront"

  project_name    = var.project_name
  environment     = var.environment
  domain_names    = var.frontend_domain_names
  certificate_arn = var.frontend_certificate_arn
  price_class     = var.cloudfront_price_class
}

# =============================================================================
# RDS — MSSQL Express
# =============================================================================
module "rds" {
  source = "./modules/rds"

  project_name          = var.project_name
  environment           = var.environment
  private_subnet_ids    = module.networking.private_subnet_ids
  rds_security_group_id = module.networking.rds_security_group_id
  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  db_username           = var.db_username
  db_password           = var.db_password
  multi_az              = var.rds_multi_az
  backup_retention_period   = var.rds_backup_retention_period
  deletion_protection       = var.rds_deletion_protection
  skip_final_snapshot       = var.rds_skip_final_snapshot
  performance_insights_enabled = var.rds_performance_insights_enabled
}

# =============================================================================
# ElastiCache — Redis
# =============================================================================
module "elasticache" {
  source = "./modules/elasticache"

  project_name            = var.project_name
  environment             = var.environment
  private_subnet_ids      = module.networking.private_subnet_ids
  redis_security_group_id = module.networking.redis_security_group_id
  node_type               = var.redis_node_type
  num_cache_clusters      = var.redis_num_cache_clusters
  snapshot_retention_limit = var.redis_snapshot_retention_limit
}

# =============================================================================
# ECS — Fargate Backend Service
# =============================================================================
module "ecs" {
  source = "./modules/ecs"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  private_subnet_ids    = module.networking.private_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  ecs_security_group_id = module.networking.ecs_security_group_id

  container_image         = var.container_image
  container_port          = var.container_port
  task_cpu                = var.ecs_task_cpu
  task_memory             = var.ecs_task_memory
  desired_count           = var.ecs_desired_count
  certificate_arn         = var.backend_certificate_arn

  database_url            = module.rds.database_url
  redis_url               = module.elasticache.redis_url
  jwt_secret_arn          = var.jwt_secret_arn
  attachments_bucket_arn  = module.s3_attachments.bucket_arn
  attachments_bucket_name = module.s3_attachments.bucket_name
  ses_from_email          = var.ses_from_email
  frontend_url            = module.s3_cloudfront.frontend_url

  enable_container_insights = var.ecs_enable_container_insights
  log_retention_days        = var.ecs_log_retention_days
}

# =============================================================================
# SES — Email Service
# =============================================================================
module "ses" {
  source = "./modules/ses"

  project_name     = var.project_name
  environment      = var.environment
  domain           = var.ses_domain
  from_email       = var.ses_from_email
  route53_zone_id  = var.ses_route53_zone_id
}
