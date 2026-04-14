resource "azurerm_storage_account" "main" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
  access_tier              = "Hot"
  min_tls_version          = "TLS1_2"
}

resource "azurerm_storage_container" "thumbs" {
  name                  = var.blob_container_name
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}

resource "azurerm_storage_share" "appdata" {
  name               = var.appdata_share_name
  storage_account_id = azurerm_storage_account.main.id
  quota              = 5
}
