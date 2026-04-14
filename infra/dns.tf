resource "azurerm_app_service_custom_hostname_binding" "main" {
  hostname            = var.custom_domain
  app_service_name    = azurerm_linux_web_app.main.name
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_app_service_managed_certificate" "main" {
  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.main.id
}

resource "azurerm_app_service_certificate_binding" "main" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.main.id
  certificate_id      = azurerm_app_service_managed_certificate.main.id
  ssl_state           = "SniEnabled"
}
