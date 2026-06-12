output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.mssql.endpoint
}

output "address" {
  description = "RDS instance address (hostname)"
  value       = aws_db_instance.mssql.address
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.mssql.port
}

output "database_url" {
  description = "Connection string for the backend"
  value       = "sqlserver://${aws_db_instance.mssql.address}:${aws_db_instance.mssql.port};database=acr;user=${var.db_username};password=${var.db_password};encrypt=true;trustServerCertificate=true"
  sensitive   = true
}

output "instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.mssql.id
}
