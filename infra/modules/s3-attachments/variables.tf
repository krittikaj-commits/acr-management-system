variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "allowed_origins" {
  description = "Allowed CORS origins for the attachments bucket"
  type        = list(string)
  default     = ["*"]
}
