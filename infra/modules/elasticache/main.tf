# =============================================================================
# ElastiCache Module — Redis Cluster
# =============================================================================

# --- Subnet Group ---
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-redis-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-subnet"
    Environment = var.environment
  }
}

# --- Redis Replication Group ---
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  description          = "Redis cache for ${var.project_name} ${var.environment}"

  node_type            = var.node_type
  num_cache_clusters   = var.num_cache_clusters
  port                 = 6379
  parameter_group_name = var.parameter_group_name
  engine_version       = var.engine_version

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.redis_security_group_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = var.transit_encryption_enabled

  automatic_failover_enabled = var.num_cache_clusters > 1 ? true : false

  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = "04:00-05:00"
  maintenance_window       = "mon:05:00-mon:06:00"

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis"
    Environment = var.environment
  }
}
