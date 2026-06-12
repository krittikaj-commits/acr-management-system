# =============================================================================
# SES Module — Domain Identity + DKIM
# =============================================================================

# --- SES Domain Identity ---
resource "aws_ses_domain_identity" "main" {
  domain = var.domain
}

# --- SES Domain DKIM ---
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# --- Route53 DKIM Records (optional, only if zone_id provided) ---
resource "aws_route53_record" "ses_dkim" {
  count   = var.route53_zone_id != "" ? 3 : 0
  zone_id = var.route53_zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# --- Route53 Domain Verification Record (optional) ---
resource "aws_route53_record" "ses_verification" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "_amazonses.${var.domain}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

# --- SES Domain Identity Verification ---
resource "aws_ses_domain_identity_verification" "main" {
  count  = var.route53_zone_id != "" ? 1 : 0
  domain = aws_ses_domain_identity.main.domain

  depends_on = [aws_route53_record.ses_verification]
}

# --- SES Email Identity (from email) ---
resource "aws_ses_email_identity" "from" {
  count = var.from_email != "" ? 1 : 0
  email = var.from_email
}
