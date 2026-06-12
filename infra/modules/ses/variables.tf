variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "domain" {
  description = "Domain name for SES identity verification"
  type        = string
}

variable "from_email" {
  description = "Sender email address to verify"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for automatic DNS verification (optional)"
  type        = string
  default     = ""
}
