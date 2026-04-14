resource "azurerm_service_plan" "main" {
  name                = var.app_service_plan_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "B2"
}

resource "azurerm_linux_web_app" "main" {
  name                = var.web_app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on = true

    application_stack {
      docker_image_name        = var.docker_image
      docker_registry_url      = "https://ghcr.io"
    }
  }

  app_settings = {
    "ConnectionStrings__ConnectionString" = "Server=tcp:${var.sql_server_name}.database.windows.net,1433;Initial Catalog=${var.sql_db_name};Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Managed Identity;"
    "ConnectionStrings__DataProvider"     = "SqlServer"
    "ASPNETCORE_ENVIRONMENT"              = "Production"
    "WEBSITES_PORT"                       = "80"
  }

  storage_account {
    name         = "appdata"
    type         = "AzureFiles"
    account_name = azurerm_storage_account.main.name
    share_name   = azurerm_storage_share.appdata.name
    access_key   = azurerm_storage_account.main.primary_access_key
    mount_path   = "/app/App_Data"
  }
}
