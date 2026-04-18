#!/usr/bin/env bash
# =============================================================================
# deploy-phase1.sh — nopCommerce Phase 1 Azure deployment (one-shot)
#
# Usage:
#   chmod +x infra/deploy-phase1.sh
#   ./infra/deploy-phase1.sh
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - .NET 9 SDK installed
#   - DNS CNAME for CUSTOM_DOMAIN pointing to $WEB_APP_NAME.azurewebsites.net
#     (must be in place BEFORE Step 9 - SSL binding)
# =============================================================================
set -euo pipefail

# =============================================================================
# STEP 1.1 — Configuration — edit these before running
# =============================================================================
RESOURCE_GROUP="kalibeenne-nop-prod"   # globally unique within subscription
LOCATION="westeurope"
SQL_SERVER_NAME="sql-kalibeenne-prod"   # globally unique
SQL_DB_NAME="kalibeenne-nop-db"         # globally unique within server
STORAGE_ACCOUNT="kalibeennestorage"      # globally unique, lowercase, no dashes
BLOB_CONTAINER="kalibeennecontainer"   # globally unique within storage account, lowercase
APP_SERVICE_PLAN="plan-kalibeenne-prod"
WEB_APP_NAME="kalibeenne-prod"      # globally unique — must match SQL user in T-SQL grant
CUSTOM_DOMAIN=""       # set to "" to skip SSL binding

BACPAC_PATH="./infra/kalibeenne-dev-backup-10012026.bacpac"         # path to a .bacpac file to restore into the DB
                       # e.g. BACPAC_PATH="./backup/nopcommerce.bacpac"
RESTORE_BACPAC=false   # set to true to restore the BACPAC into the DB (skips install wizard)

PUBLISH_ZIP_PATH="./infra/releasev12-kalibeenne.zip"    # optional: path to a pre-built zip to deploy (skips dotnet build)
                       # e.g. PUBLISH_ZIP_PATH="./nopcommerce.zip"
                       # leave empty to build from source

az login --tenant df65a2d3-62aa-4f80-bab1-b43469ca0f66

# =============================================================================
# Pre-flight checks
# =============================================================================
echo "=== Pre-flight checks ==="
az account show --query "{subscription:name, id:id}" -o table
echo ""

# =============================================================================
# STEP 1.2 — Resource Group
# =============================================================================
echo "=== [1/8] Creating resource group: $RESOURCE_GROUP ==="
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

# =============================================================================
# STEP 1.3 — Azure SQL Server (Entra-only auth — no SQL password)
# =============================================================================
echo "=== [2/8] Creating SQL Server (Entra-only auth) ==="
MY_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
MY_UPN=$(az ad signed-in-user show --query userPrincipalName -o tsv)

if ! az sql server show --name "$SQL_SERVER_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  az sql server create \
    --name "$SQL_SERVER_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --enable-ad-only-auth \
    --external-admin-name "$MY_UPN" \
    --external-admin-sid "$MY_OBJECT_ID"
else
  echo "SQL Server '$SQL_SERVER_NAME' already exists, skipping."
fi

# Allow Azure services (App Service → SQL via Managed Identity)
if ! az sql server firewall-rule show \
    --server "$SQL_SERVER_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --name "AllowAzureServices" &>/dev/null; then
  az sql server firewall-rule create \
    --server "$SQL_SERVER_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --name "AllowAzureServices" \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0
fi

# Allow current local IP — always update in case IP changed
LOCAL_IP=$(curl -s https://api.ipify.org)
echo "Allowing local dev IP: $LOCAL_IP"
az sql server firewall-rule create \
  --server "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --name "AllowLocalDev" \
  --start-ip-address "$LOCAL_IP" \
  --end-ip-address "$LOCAL_IP" 2>/dev/null || \
az sql server firewall-rule update \
  --server "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --name "AllowLocalDev" \
  --start-ip-address "$LOCAL_IP" \
  --end-ip-address "$LOCAL_IP"

if ! az sql db show \
    --server "$SQL_SERVER_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --name "$SQL_DB_NAME" &>/dev/null; then
  az sql db create \
    --server "$SQL_SERVER_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --name "$SQL_DB_NAME" \
    --edition Basic \
    --capacity 5 \
    --max-size 2GB
else
  echo "SQL Database '$SQL_DB_NAME' already exists, skipping."
fi

# =============================================================================
# STEP 1.3b — Restore BACPAC (optional — set RESTORE_BACPAC=true to enable)
# Uses sqlpackage with Active Directory Default auth (Entra-only compatible).
# The import runs as YOU (the Entra admin) — no SQL password needed.
# After a successful import, skip the nopCommerce install wizard.
# =============================================================================
if [[ "$RESTORE_BACPAC" == true ]]; then
  echo "=== [2b] Restoring BACPAC: $BACPAC_PATH ==="

  if [[ ! -f "$BACPAC_PATH" ]]; then
    echo "ERROR: BACPAC file not found at: $BACPAC_PATH" >&2
    exit 1
  fi

  # Install sqlpackage dotnet global tool if not already present
  if ! command -v sqlpackage &>/dev/null; then
    echo "Installing sqlpackage CLI..."
    dotnet tool install -g microsoft.sqlpackage
    export PATH="$PATH:$HOME/.dotnet/tools"
  fi

  # Import BACPAC into the empty database.
  # 'Active Directory Default' resolves credentials via the Azure CLI token —
  # works with Entra-only servers (no SQL admin password required).
  sqlpackage /Action:Import \
    /SourceFile:"$BACPAC_PATH" \
    /TargetConnectionString:"Server=tcp:${SQL_SERVER_NAME}.database.windows.net,1433;Initial Catalog=${SQL_DB_NAME};Authentication=Active Directory Default;Encrypt=True;TrustServerCertificate=False;"

  echo "BACPAC restore complete."
fi

# =============================================================================
# STEP 1.4 — Storage Account + Blob Container + Azure Files share
# =============================================================================
echo "=== [3/8] Creating storage account: $STORAGE_ACCOUNT ==="
if ! az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  az storage account create \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --access-tier Hot \
    --min-tls-version TLS1_2
else
  echo "Storage account '$STORAGE_ACCOUNT' already exists, skipping."
fi

STORAGE_KEY=$(az storage account keys list \
  --account-name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[0].value" -o tsv)

if [[ -z "$STORAGE_KEY" ]]; then
  echo "ERROR: Could not retrieve storage key for '$STORAGE_ACCOUNT'. Check the account name and resource group." >&2
  exit 1
fi

if [[ "$(az storage container exists \
    --name "$BLOB_CONTAINER" \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --query exists -o tsv 2>/dev/null)" != "true" ]]; then
  az storage container create \
    --name "$BLOB_CONTAINER" \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --public-access off
else
  echo "Blob container '$BLOB_CONTAINER' already exists, skipping."
fi

# =============================================================================
# STEP 1.5 — App Service Plan + Web App + Managed Identity
# =============================================================================
echo "=== [4/8] Creating App Service plan and web app ==="
if ! az appservice plan show --name "$APP_SERVICE_PLAN" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  az appservice plan create \
    --name "$APP_SERVICE_PLAN" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku B2 \
    --is-linux
else
  echo "App Service Plan '$APP_SERVICE_PLAN' already exists, skipping."
fi

if ! az webapp show --name "$WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  az webapp create \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$APP_SERVICE_PLAN" \
    --runtime "DOTNETCORE:9.0"
else
  echo "Web App '$WEB_APP_NAME' already exists, skipping."
fi

az webapp update \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --https-only true

az webapp config set \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --always-on true

az webapp identity assign \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP"

PRINCIPAL_ID=$(az webapp identity show \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query principalId -o tsv)

echo "Managed Identity Principal ID: $PRINCIPAL_ID"

# =============================================================================
# STEP 1.7 — App_Data persistence + App settings
# Linux App Service /home is already a persistent Azure-managed file share.
# No custom storage mount needed (which requires Standard tier or containers).
# We store App_Data under /home/App_Data and symlink it into the app root.
# =============================================================================
echo "=== [5/8] Configuring App_Data persistence + app settings ==="

# Startup command: ensure /home/App_Data exists, symlink into app root, start
az webapp config set \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "mkdir -p /home/App_Data && ln -sf /home/App_Data /home/site/wwwroot/App_Data && dotnet /home/site/wwwroot/Nop.Web.dll"

az webapp config appsettings set \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    "ConnectionStrings__ConnectionString=Server=tcp:${SQL_SERVER_NAME}.database.windows.net,1433;Initial Catalog=${SQL_DB_NAME};Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Managed Identity;" \
    "ConnectionStrings__DataProvider=SqlServer" \
    "ASPNETCORE_ENVIRONMENT=Production"

# =============================================================================
# STEP 1.8 — Build & Deploy
# =============================================================================
if [[ -n "$PUBLISH_ZIP_PATH" ]]; then
  echo "=== [6/8] Deploying pre-built zip: $PUBLISH_ZIP_PATH ==="
  if [[ ! -f "$PUBLISH_ZIP_PATH" ]]; then
    echo "ERROR: zip file not found at: $PUBLISH_ZIP_PATH" >&2
    exit 1
  fi
  _DEPLOY_ZIP="$PUBLISH_ZIP_PATH"
  _CLEANUP=false
else
  echo "=== [6/8] Building and deploying nopCommerce ==="
  dotnet publish src/Presentation/Nop.Web/Nop.Web.csproj -c Release -o ./publish
  (cd publish && zip -r ../nopcommerce.zip .)
  _DEPLOY_ZIP="nopcommerce.zip"
  _CLEANUP=true
fi

az webapp deploy \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --src-path "$_DEPLOY_ZIP" \
  --type zip

if [[ "$_CLEANUP" == true ]]; then
  rm -rf ./publish ./nopcommerce.zip
fi

# =============================================================================
# STEP 1.9 — Custom Domain + SSL (skipped if CUSTOM_DOMAIN is empty)
# =============================================================================
if [[ -n "$CUSTOM_DOMAIN" && "$CUSTOM_DOMAIN" != "www.yourdomain.com" ]]; then
  echo "=== [7/8] Binding custom domain: $CUSTOM_DOMAIN ==="
  echo ""
  echo ">>> Ensure your DNS CNAME is already set:"
  echo ">>>   $CUSTOM_DOMAIN  →  $WEB_APP_NAME.azurewebsites.net"
  read -rp "Press Enter when DNS is propagated, or Ctrl+C to abort..."

  az webapp config hostname add \
    --hostname "$CUSTOM_DOMAIN" \
    --webapp-name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP"

  az webapp config ssl create \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --hostname "$CUSTOM_DOMAIN"

  THUMBPRINT=$(az webapp config ssl list \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?subjectName=='${CUSTOM_DOMAIN}'].thumbprint" -o tsv)

  az webapp config ssl bind \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --certificate-thumbprint "$THUMBPRINT" \
    --ssl-type SNI
else
  echo "=== [7/8] Skipping custom domain (CUSTOM_DOMAIN not set) ==="
fi

# =============================================================================
# Done — print next manual steps
# =============================================================================
echo ""
echo "============================================================"
echo " Deployment complete!"
echo "============================================================"
echo ""
echo " App URL : https://${WEB_APP_NAME}.azurewebsites.net"
echo " MI Principal ID : $PRINCIPAL_ID"
echo ""
echo "--- NEXT: T-SQL grant (one-time, cannot be automated) -------"
echo " Connect via Azure Portal → SQL Database → Query Editor"
echo " (log in with your Entra ID — you are the Entra admin)"
echo ""
echo "  CREATE USER [${WEB_APP_NAME}] FROM EXTERNAL PROVIDER;"
echo "  ALTER ROLE db_owner ADD MEMBER [${WEB_APP_NAME}];"
echo ""
if [[ "$RESTORE_BACPAC" == true ]]; then
  echo "--- BACPAC restored — skip the install wizard ---------------"
  echo " The database is already populated from: $BACPAC_PATH"
  echo " Navigate directly to https://${WEB_APP_NAME}.azurewebsites.net"
else
  echo "--- THEN: run the nopCommerce install wizard ----------------"
  echo " Navigate to https://${WEB_APP_NAME}.azurewebsites.net"
  echo " Use connection string:"
  echo "  Server=tcp:${SQL_SERVER_NAME}.database.windows.net,1433;"
  echo "  Initial Catalog=${SQL_DB_NAME};Encrypt=True;"
  echo "  TrustServerCertificate=False;"
  echo "  Authentication=Active Directory Managed Identity;"
fi
echo "============================================================"
