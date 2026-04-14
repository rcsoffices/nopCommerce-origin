variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-nopcommerce-prod"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "westeurope"
}

variable "sql_server_name" {
  description = "Azure SQL Server name (globally unique)"
  type        = string
  default     = "sql-nopcommerce-prod"
}

variable "sql_db_name" {
  description = "Azure SQL Database name"
  type        = string
  default     = "nopcommerce"
}

variable "storage_account_name" {
  description = "Storage account name (globally unique, lowercase, no dashes)"
  type        = string
  default     = "stnopcommerceprod"
}

variable "blob_container_name" {
  description = "Blob container name for product images"
  type        = string
  default     = "nop-thumbs"
}

variable "appdata_share_name" {
  description = "Azure Files share name for App_Data"
  type        = string
  default     = "nop-appdata"
}

variable "app_service_plan_name" {
  description = "App Service Plan name"
  type        = string
  default     = "plan-nopcommerce-prod"
}

variable "web_app_name" {
  description = "Web App name (globally unique, must match SQL user name in T-SQL grant)"
  type        = string
  default     = "app-nopcommerce-prod"
}

variable "custom_domain" {
  description = "Custom domain (e.g. www.yourdomain.com)"
  type        = string
  default     = "www.yourdomain.com"
}

variable "docker_image" {
  description = "Full Docker image reference from GHCR"
  type        = string
  default     = "ghcr.io/<OWNER>/nopcommerce:latest"
}

variable "entra_admin_object_id" {
  description = "Object ID to set as SQL Entra admin (defaults to the identity running Terraform)"
  type        = string
  default     = ""
}
