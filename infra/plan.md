# Plan: Industrialize nopCommerce Deployment on Azure

## TL;DR
Deploy nopCommerce (.NET 10) to Azure in two phases:
- **Phase 1** — Manual deployment (~$31/mo): App Service B2 + SQL Basic + Blob Storage + Azure Files, using System Assigned Managed Identity + Entra-only SQL auth.
- **Phase 2** — Industrialization: Terraform IaC, Docker + GHCR, GitHub Actions CI/CD.

## Decisions
- Cloud: Azure | DB: SQL Server (Basic 5 DTU) | App: B2 Linux (2 cores, 3.5 GB)
- **Auth: System Assigned Managed Identity, Entra-only SQL** — zero SQL passwords anywhere
- Container Registry: GHCR (free) | CI/CD: GitHub Actions | Env: Production only
- Custom domain + free managed SSL | Blob: Azure Blob plugin for product images
- App_Data persistence: Azure Files mount at `/app/App_Data`
- Config via environment variables (`ConnectionStrings__*` pattern)

### Auth strategy (Option A — Entra-only)
- SQL Server created with `--no-admin --enable-ad-only-auth` → **SQL auth is entirely disabled at the server level**
- No SQL admin password exists — not in shell variables, not in GitHub Secrets, not in Terraform state
- Microsoft.Data.SqlClient v7.0.0 (used by nopCommerce) natively supports `Authentication=Active Directory Managed Identity` — **no code changes needed**
- Terraform uses `azuread_authentication_only = true` — the `administrator_login` / `administrator_login_password` fields are omitted
- The only manual step that cannot be automated by Terraform: T-SQL `CREATE USER ... FROM EXTERNAL PROVIDER` (Terraform cannot execute T-SQL). Run once via Azure Portal Query Editor.

---

## Phase 1: Manual Deployment via Azure CLI (~$31/mo)

### Prerequisites
- Azure CLI installed and logged in (`az login`)
- .NET 10 SDK installed locally
- A custom domain you control (DNS access)

---

### Step 1.1 — Set Shell Variables

```bash
RESOURCE_GROUP="rg-nopcommerce-prod"
LOCATION="westeurope"
SQL_SERVER_NAME="sql-nopcommerce-prod"  # globally unique
SQL_DB_NAME="nopcommerce"
STORAGE_ACCOUNT="stnopcommerceprod"      # globally unique, lowercase, no dashes
BLOB_CONTAINER="nop-thumbs"
APP_SERVICE_PLAN="plan-nopcommerce-prod"
WEB_APP_NAME="app-nopcommerce-prod"      # globally unique — must match SQL user name created in T-SQL
CUSTOM_DOMAIN="www.yourdomain.com"
```

> **No SQL_ADMIN_USER or SQL_ADMIN_PASSWORD** — SQL auth is fully disabled on this server.

### Step 1.2 — Create Resource Group

```bash
az group create --name $RESOURCE_GROUP --location $LOCATION
```

### Step 1.3 — Create Azure SQL Server with Entra-only auth

```bash
# Retrieve your own Entra ID identity (you become the Entra admin)
MY_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
MY_UPN=$(az ad signed-in-user show --query userPrincipalName -o tsv)

# Create SQL Server — no SQL admin, Entra ID only
# --no-admin          → skips SQL admin credentials entirely
# --enable-ad-only-auth → disables SQL auth at the server level
az sql server create \
  --name $SQL_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-ad-only-auth \
  --external-admin-name $MY_UPN \
  --external-admin-sid $MY_OBJECT_ID

# Allow Azure services (needed for App Service → SQL via MI)
az sql server firewall-rule create \
  --server $SQL_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --name "AllowAzureServices" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow local dev IP (for Query Editor / sqlcmd access)
az sql server firewall-rule create \
  --server $SQL_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --name "AllowLocalDev" \
  --start-ip-address <YOUR_IP> \
  --end-ip-address <YOUR_IP>

# Create Basic-tier database
az sql db create \
  --server $SQL_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --name $SQL_DB_NAME \
  --edition Basic \
  --capacity 5 \
  --max-size 2GB
```

### Step 1.4 — Create Azure Blob Storage + Azure Files share

```bash
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --min-tls-version TLS1_2

STORAGE_KEY=$(az storage account keys list \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query "[0].value" -o tsv)

# Blob container for product images
az storage container create \
  --name $BLOB_CONTAINER \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --public-access off

# Azure Files share for App_Data persistence
az storage share create \
  --name "nop-appdata" \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --quota 5

# Seed share from repo (mount hides Docker image's bundled files)
az storage file upload-batch \
  --source ./src/Presentation/Nop.Web/App_Data \
  --destination nop-appdata \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY
```

### Step 1.5 — Create App Service + Enable System Assigned Identity

```bash
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux

az webapp create \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime "DOTNETCORE:10.0"

az webapp update \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --https-only true

az webapp config set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --always-on true

# Enable System Assigned Managed Identity
az webapp identity assign \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP

PRINCIPAL_ID=$(az webapp identity show \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

echo "MI Principal ID: $PRINCIPAL_ID"
```

### Step 1.6 — Grant MI access to SQL Database (T-SQL, one-time)

Connect via **Azure Portal → SQL Database → Query Editor** (login with your Entra ID account — you are the Entra admin set in Step 1.3):

```sql
-- Create a user mapped to the App Service Managed Identity
-- Name must match the Web App name exactly
CREATE USER [app-nopcommerce-prod] FROM EXTERNAL PROVIDER;

-- db_owner needed for initial install (nopCommerce creates schema/tables/indexes)
ALTER ROLE db_owner ADD MEMBER [app-nopcommerce-prod];

-- Optional: after install completes, downgrade to least privilege:
-- ALTER ROLE db_owner DROP MEMBER [app-nopcommerce-prod];
-- ALTER ROLE db_datareader ADD MEMBER [app-nopcommerce-prod];
-- ALTER ROLE db_datawriter ADD MEMBER [app-nopcommerce-prod];
```

> This is the **only manual step that cannot be automated** — Terraform cannot execute T-SQL. Everything else is automated.

### Step 1.7 — Mount Azure Files + Configure Environment Variables

```bash
# Mount Azure Files share for App_Data persistence
az webapp config storage-account add \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --custom-id appdata \
  --storage-type AzureFiles \
  --account-name $STORAGE_ACCOUNT \
  --share-name nop-appdata \
  --access-key $STORAGE_KEY \
  --mount-path /home/site/wwwroot/App_Data

# Set environment variables — completely passwordless
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    ConnectionStrings__ConnectionString="Server=tcp:$SQL_SERVER_NAME.database.windows.net,1433;Initial Catalog=$SQL_DB_NAME;Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Managed Identity;" \
    ConnectionStrings__DataProvider="SqlServer" \
    ASPNETCORE_ENVIRONMENT="Production"
```

### Step 1.8 — Build & Deploy

```bash
dotnet publish src/Presentation/Nop.Web/Nop.Web.csproj -c Release -o ./publish

cd publish && zip -r ../nopcommerce.zip . && cd ..

az webapp deploy \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src-path nopcommerce.zip \
  --type zip
```

### Step 1.9 — Custom Domain + SSL

Add DNS CNAME `www` → `$WEB_APP_NAME.azurewebsites.net` at your registrar first, then:

```bash
az webapp config hostname add \
  --hostname $CUSTOM_DOMAIN \
  --webapp-name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP

az webapp config ssl create \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname $CUSTOM_DOMAIN

THUMBPRINT=$(az webapp config ssl list \
  --resource-group $RESOURCE_GROUP \
  --query "[?subjectName=='$CUSTOM_DOMAIN'].thumbprint" -o tsv)

az webapp config ssl bind \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --certificate-thumbprint $THUMBPRINT \
  --ssl-type SNI
```

### Step 1.10 — Run nopCommerce Install Wizard

1. Navigate to `https://$CUSTOM_DOMAIN`
2. Fill in admin email + password
3. **Database:** select "Use raw connection string" and paste:
   ```
   Server=tcp:sql-nopcommerce-prod.database.windows.net,1433;Initial Catalog=nopcommerce;Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Managed Identity;
   ```
4. Check "Install sample data" for testing
5. Click **Install** (1-2 min)

### Step 1.11 — Enable Azure Blob Storage Plugin

1. `/admin` → **Configuration → Local Plugins**
2. **Azure Blob Storage** → **Install** → **Restart**
3. Configure:
   - **Connection string:** `DefaultEndpointsProtocol=https;AccountName=stnopcommerceprod;AccountKey=<KEY>;EndpointSuffix=core.windows.net`
   - **Container name:** `nop-thumbs`
   - **End point:** `https://stnopcommerceprod.blob.core.windows.net/`
   - **Append container name:** ✓
4. **Save**

### Phase 1 Verification

| # | Check | How |
|---|-------|-----|
| 1 | HTTPS works | `curl -I https://$CUSTOM_DOMAIN` → 200 |
| 2 | HTTP redirects | `curl -I http://$CUSTOM_DOMAIN` → 301 |
| 3 | Admin panel | Login at `/admin` |
| 4 | Entra-only enforced | Try SQL auth via SSMS → must be rejected ("Login failed, SQL auth disabled") |
| 5 | DB via MI | Admin → System → System Information → shows SQL Server |
| 6 | App_Data persists | `az webapp restart` → re-login → wizard does NOT reappear |
| 7 | Blob storage | Upload product image → check `nop-thumbs` in Azure Portal |
| 8 | SSL valid | Browser padlock, no warnings |

---

## Phase 2: Industrialization (Terraform + Docker + GitHub Actions)

### Architecture

```
Code push → GitHub Actions CI (ci.yml)
               ├─ Build + Test
               ├─ Docker build
               └─ Push to GHCR (SHA + latest tags)
                        ↓
            GitHub Actions Deploy (deploy.yml) [manual]
               ├─ az webapp config container set
               └─ Smoke test curl

infra/ change → GitHub Actions Infra (infra.yml)
               ├─ terraform plan (on PR)
               └─ terraform apply (on merge)
```

### Step 2.0 — Create Azure Service Principal

```bash
az ad sp create-for-rbac \
  --name "sp-nopcommerce-ghactions" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```

**GitHub Secrets — NO SQL password needed:**

| Secret | Value |
|--------|-------|
| `AZURE_CREDENTIALS` | Full SP JSON |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID |
| `AZURE_RESOURCE_GROUP` | `rg-nopcommerce-prod` |
| `AZURE_WEBAPP_NAME` | `app-nopcommerce-prod` |
| `ARM_CLIENT_ID` | clientId from SP JSON |
| `ARM_CLIENT_SECRET` | clientSecret from SP JSON |
| `ARM_TENANT_ID` | tenantId from SP JSON |
| `ARM_SUBSCRIPTION_ID` | Subscription ID |

> `SQL_ADMIN_PASSWORD` is completely absent — SQL auth is disabled at the server level.

### Step 2.1 — Terraform State Backend

```bash
az storage account create \
  --name "stnopcommercetfstate" \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_LRS \
  --kind StorageV2

az storage container create \
  --name "tfstate" \
  --account-name "stnopcommercetfstate"
```

### Step 2.2 — Terraform Files

**`infra/.gitignore`:**
```
.terraform/
*.tfstate
*.tfstate.*
*.tfvars
.terraform.lock.hcl
```

**`infra/main.tf`:**
- Provider `azurerm ~> 4.0`, backend `azurerm` (stnopcommercetfstate/tfstate/nopcommerce.tfstate)
- `data "azurerm_client_config" "current"` — used to set Entra admin to the Service Principal itself
- `azurerm_resource_group.main`

**`infra/variables.tf`** — 12 variables, **no `sql_admin_password`:**
- `resource_group_name`, `location`
- `sql_server_name`, `sql_db_name`
- `storage_account_name`, `blob_container_name`, `appdata_share_name`
- `app_service_plan_name`, `web_app_name`
- `custom_domain`
- `docker_image` (default: `ghcr.io/<OWNER>/nopcommerce:latest`)
- `entra_admin_object_id` (the object ID to set as SQL Entra admin — defaults to the SP running Terraform)

**`infra/sql.tf` — Entra-only, no SQL admin:**
```hcl
resource "azurerm_mssql_server" "main" {
  name                = var.sql_server_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  version             = "12.0"
  minimum_tls_version = "1.2"

  # No administrator_login / administrator_login_password
  azuread_administrator {
    login_username              = "EntraAdmin"
    object_id                   = data.azurerm_client_config.current.object_id
    azuread_authentication_only = true  # SQL auth fully disabled
  }
}
# + azurerm_mssql_firewall_rule (AllowAzureServices)
# + azurerm_mssql_database (Basic, 2 GB, 7-day retention)
```

**`infra/storage.tf`:**
- `azurerm_storage_account`: Standard LRS, Hot, TLS 1.2
- `azurerm_storage_container` ("nop-thumbs"): private
- `azurerm_storage_share` ("nop-appdata"): quota 5 GB

**`infra/app-service.tf`:**
- `azurerm_service_plan`: Linux, B2
- `azurerm_linux_web_app`:
  - `identity { type = "SystemAssigned" }` — enables MI
  - `site_config`: always_on=true, docker image from var
  - `app_settings`: passwordless connection string, DataProvider=SqlServer, ASPNETCORE_ENVIRONMENT=Production, WEBSITES_PORT=80
  - `https_only = true`
  - `storage_account` block: Azure Files mount at `/app/App_Data`

**`infra/dns.tf`:**
- Hostname binding + managed cert + SNI cert binding

**`infra/outputs.tf`:**
- `web_app_url`, `sql_server_fqdn`, `storage_blob_endpoint`
- `web_app_identity_principal_id` — use this to run the T-SQL grant in Step 2.3

### Step 2.3 — Post-apply: T-SQL grant (one-time manual step)

After `terraform apply`, read the output principal ID and connect via Azure Portal Query Editor:

```bash
terraform output web_app_identity_principal_id
```

```sql
CREATE USER [app-nopcommerce-prod] FROM EXTERNAL PROVIDER;
ALTER ROLE db_owner ADD MEMBER [app-nopcommerce-prod];
```

This is the sole manual step. Everything else is fully automated by Terraform + GitHub Actions.

### Step 2.4 — Docker Setup

No changes to Dockerfile. Images tagged `ghcr.io/<OWNER>/nopcommerce:<SHA>` + `:latest`.

Seed App_Data share once after `terraform apply` (then never again):
```bash
az storage file upload-batch \
  --source ./src/Presentation/Nop.Web/App_Data \
  --destination nop-appdata \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY
```

### Step 2.5 — GitHub Actions Workflows

**`.github/workflows/ci.yml`** — push/PR to develop:
- `build-and-test`: restore → build → test
- `docker` (push to develop only): build → push to GHCR (SHA + latest tags)

**`.github/workflows/deploy.yml`** — manual `workflow_dispatch`:
- `azure/login@v2` → `az webapp config container set` → smoke test curl

**`.github/workflows/infra.yml`** — push on `infra/**` or manual:
- `terraform-plan` (PR only): init → plan → comment on PR
- `terraform-apply` (push to develop only): init → apply

**Delete:** `.github/workflows/dotnet.yml` (replaced by ci.yml)

### Step 2.6 — Import Phase 1 Resources into Terraform

```bash
cd infra && terraform init

terraform import azurerm_resource_group.main \
  /subscriptions/<SUB>/resourceGroups/rg-nopcommerce-prod

terraform import azurerm_mssql_server.main \
  /subscriptions/<SUB>/resourceGroups/rg-nopcommerce-prod/providers/Microsoft.Sql/servers/sql-nopcommerce-prod

terraform import azurerm_mssql_database.main \
  /subscriptions/<SUB>/resourceGroups/rg-nopcommerce-prod/providers/Microsoft.Sql/servers/sql-nopcommerce-prod/databases/nopcommerce

terraform import azurerm_storage_account.main \
  /subscriptions/<SUB>/resourceGroups/rg-nopcommerce-prod/providers/Microsoft.Storage/storageAccounts/stnopcommerceprod

terraform import azurerm_storage_container.thumbs \
  https://stnopcommerceprod.blob.core.windows.net/nop-thumbs

terraform import azurerm_storage_share.appdata \
  https://stnopcommerceprod.file.core.windows.net/nop-appdata

terraform import azurerm_service_plan.main \
  /subscriptions/<SUB>/resourceGroups/rg-nopcommerce-prod/providers/Microsoft.Web/serverfarms/plan-nopcommerce-prod

terraform import azurerm_linux_web_app.main \
  /subscriptions/<SUB>/resourceGroups/rg-nopcommerce-prod/providers/Microsoft.Web/sites/app-nopcommerce-prod

# Should show "No changes"
terraform plan
```

> No `-var="sql_admin_password=..."` needed — the variable no longer exists.

---

## Files Summary

| File | Action | Notes |
|------|--------|-------|
| `infra/main.tf` | Create | Provider + backend + resource group + `data.azurerm_client_config` |
| `infra/variables.tf` | Create | 12 vars, **no sql_admin_password** |
| `infra/sql.tf` | Create | Entra-only, `azuread_authentication_only = true`, no admin_login fields |
| `infra/storage.tf` | Create | Blob container + Azure Files share |
| `infra/app-service.tf` | Create | SystemAssigned MI, passwordless connection string, Azure Files mount |
| `infra/dns.tf` | Create | Custom domain + managed SSL |
| `infra/outputs.tf` | Create | Includes `web_app_identity_principal_id` |
| `infra/.gitignore` | Create | Standard |
| `.github/workflows/ci.yml` | Create | Build + test + Docker push |
| `.github/workflows/deploy.yml` | Create | Container deploy |
| `.github/workflows/infra.yml` | Create | Terraform plan/apply |
| `.github/workflows/dotnet.yml` | Delete | Replaced by ci.yml |
| `Dockerfile` | No change | — |
| `src/Presentation/Nop.Web/Program.cs` | No change | MS.Data.SqlClient handles MI tokens internally |

## Phase 2 Verification

| # | Check | How |
|---|-------|-----|
| 1 | Terraform clean | `terraform plan` → "No changes" after import |
| 2 | No SQL secrets | GitHub Secrets list has no SQL-related entries |
| 3 | Entra-only enforced | `az sql server show --name sql-nopcommerce-prod --query "administrators.azureAdOnlyAuthentication"` → `true` |
| 4 | MI identity exists | Azure Portal → App Service → Identity → System assigned = On, has a principal ID |
| 5 | SQL MI user exists | Portal Query Editor: `SELECT name FROM sys.database_principals WHERE name = 'app-nopcommerce-prod'` |
| 6 | No password in config | App Service → Configuration → no `User ID` or `Password` in connection string |
| 7 | CI passes | Push to develop → GitHub Actions green |
| 8 | Deploy works | Trigger deploy → container updates |
| 9 | App_Data persists | `az webapp restart` → no install wizard |
| 10 | SSL valid | `curl -vI https://yourdomain.com` → valid cert |

## Security Benefits (Entra-only + Managed Identity)

- **Zero SQL passwords** — none in shell, env vars, GitHub Secrets, Terraform state, or anywhere
- **SQL auth impossible** — disabled at server level, not just unused
- **No secret rotation** — Azure manages the identity lifecycle
- **Audit trail** — all DB connections logged in Azure AD as the App Service identity
- **Least privilege path** — after install, downgrade from `db_owner` to `db_datareader` + `db_datawriter`
- **One unavoidable manual step** — T-SQL `CREATE USER ... FROM EXTERNAL PROVIDER` (Terraform limitation, not an Azure limitation)

## Scope

**Included:** App Service B2 + System Assigned MI, SQL Basic (Entra-only auth), Blob Storage, Azure Files, Terraform, Docker + GHCR, GitHub Actions, custom domain + SSL

**Excluded:** Redis, CDN, Application Insights, staging env, WAF/DDoS
