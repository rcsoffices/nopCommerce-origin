locals {
  entra_admin_object_id = var.entra_admin_object_id != "" ? var.entra_admin_object_id : data.azurerm_client_config.current.object_id
}

resource "azurerm_mssql_server" "main" {
  name                = var.sql_server_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  version             = "12.0"
  minimum_tls_version = "1.2"

  # No administrator_login / administrator_login_password — SQL auth fully disabled
  azuread_administrator {
    login_username              = "EntraAdmin"
    object_id                   = local.entra_admin_object_id
    azuread_authentication_only = true
  }
}

resource "azurerm_mssql_firewall_rule" "allow_azure_services" {
  name            = "AllowAzureServices"
  server_id       = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_mssql_database" "main" {
  name         = var.sql_db_name
  server_id    = azurerm_mssql_server.main.id
  sku_name     = "Basic"
  max_size_gb  = 2

  short_term_retention_policy {
    retention_days = 7
  }
}
