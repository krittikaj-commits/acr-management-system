# =============================================================================
# RDS Module — MSSQL Express Instance
# =============================================================================

# --- DB Subnet Group ---
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-subnet-group"
    Environment = var.environment
  }
}

# --- RDS Instance (SQL Server Express) ---
resource "aws_db_instance" "mssql" {
  identifier = "${var.project_name}-${var.environment}-mssql"

  engine         = "sqlserver-ex"
  engine_version = var.engine_version
  instance_class = var.instance_class
  license_model  = "license-included"

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]

  multi_az            = var.multi_az
  publicly_accessible = false

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-final-snapshot"

  performance_insights_enabled = var.performance_insights_enabled

  tags = {
    Name        = "${var.project_name}-${var.environment}-mssql"
    Environment = var.environment
  }
}
