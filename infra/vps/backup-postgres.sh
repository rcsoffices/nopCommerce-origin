#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# backup-postgres.sh — Backup quotidien PostgreSQL → Scaleway Object Storage
#
# Usage :
#   ./backup-postgres.sh              — lance un backup immédiat
#   ./backup-postgres.sh --install-cron  — installe le cron (/etc/cron.d/nop-backup)
#   ./backup-postgres.sh --restore <fichier.dump.gz>  — restaure depuis S3
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
BACKUP_DIR="/opt/kalibeenne/backups"
POSTGRES_CONTAINER="$(docker ps --filter name=postgres --format '{{.Names}}' | head -1)"
AWS_CLI_IMAGE="amazon/aws-cli"
DB_NAME="nopcommerce"
DB_USER="nop"
MODE="${1:-backup}"

# --- Chargement .env ---
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Fichier .env introuvable: $ENV_FILE" >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

# --- Valeurs par défaut ---
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_LOCAL_RETENTION_DAYS="${BACKUP_LOCAL_RETENTION_DAYS:-3}"
BACKUP_CRON_SCHEDULE="${BACKUP_CRON_SCHEDULE:-0 2 * * *}"

# --- Fonction: upload S3 ---
s3_run() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$SCW_ACCESS_KEY" \
    -e AWS_SECRET_ACCESS_KEY="$SCW_SECRET_KEY" \
    -v "$BACKUP_DIR:/backups:ro" \
    "$AWS_CLI_IMAGE" \
    --endpoint-url "$SCW_ENDPOINT" \
    --region "$SCW_REGION" \
    "$@"
}

# --- Mode: install-cron ---
if [[ "$MODE" == "--install-cron" ]]; then
  CRON_FILE="/etc/cron.d/nop-backup"
  echo ">>> Installation du cron dans $CRON_FILE..."
  cat > "$CRON_FILE" <<EOF
# Backup PostgreSQL quotidien — Kalibeenne
${BACKUP_CRON_SCHEDULE} root ${SCRIPT_DIR}/backup-postgres.sh >> /var/log/nop-backup.log 2>&1
EOF
  chmod 644 "$CRON_FILE"
  echo ">>> Cron installé : ${BACKUP_CRON_SCHEDULE}"
  exit 0
fi

# --- Mode: restore ---
if [[ "$MODE" == "--restore" ]]; then
  RESTORE_FILE="${2:-}"
  if [[ -z "$RESTORE_FILE" ]]; then
    echo "Usage: $0 --restore <nom_fichier.dump.gz>" >&2
    echo "       Le fichier sera téléchargé depuis s3://${SCW_BUCKET_NAME}/${RESTORE_FILE}" >&2
    exit 1
  fi

  LOCAL_RESTORE="$BACKUP_DIR/$RESTORE_FILE"
  echo "======================================================"
  echo "  Restauration depuis S3 : $RESTORE_FILE"
  echo "======================================================"

  mkdir -p "$BACKUP_DIR"

  echo ">>> Téléchargement depuis s3://${SCW_BUCKET_NAME}/${RESTORE_FILE}..."
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$SCW_ACCESS_KEY" \
    -e AWS_SECRET_ACCESS_KEY="$SCW_SECRET_KEY" \
    -v "$BACKUP_DIR:/backups" \
    "$AWS_CLI_IMAGE" \
    --endpoint-url "$SCW_ENDPOINT" \
    --region "$SCW_REGION" \
    s3 cp "s3://${SCW_BUCKET_NAME}/${RESTORE_FILE}" "/backups/${RESTORE_FILE}"

  echo ">>> Restauration dans PostgreSQL (--clean : supprime les objets existants)..."
  gunzip -c "$LOCAL_RESTORE" | docker exec -i "$POSTGRES_CONTAINER" \
    pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges

  echo ""
  echo "======================================================"
  echo "  ✓ Restauration terminée depuis $RESTORE_FILE"
  echo "======================================================"
  exit 0
fi

# --- Mode: backup (défaut) ---
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="nopcommerce_${TIMESTAMP}.dump.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

echo "======================================================"
echo "  Backup PostgreSQL — $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

START_TIME=$(date +%s)

# --- Dump PostgreSQL ---
echo ">>> pg_dump → $BACKUP_PATH..."
if [[ -z "$POSTGRES_CONTAINER" ]]; then
  echo "ERROR: Container postgres introuvable (docker ps)" >&2
  exit 1
fi

docker exec "$POSTGRES_CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc \
  | gzip > "$BACKUP_PATH"

# --- Vérification taille ---
BACKUP_SIZE=$(stat -c%s "$BACKUP_PATH" 2>/dev/null || echo 0)
if [[ "$BACKUP_SIZE" -lt 1024 ]]; then
  echo "ERROR: Fichier de backup trop petit ($BACKUP_SIZE bytes) — dump probablement vide" >&2
  rm -f "$BACKUP_PATH"
  exit 1
fi

BACKUP_SIZE_HR=$(du -sh "$BACKUP_PATH" | cut -f1)
echo ">>> Taille backup : $BACKUP_SIZE_HR"

# --- Upload vers Scaleway Object Storage ---
echo ">>> Upload vers s3://${SCW_BUCKET_NAME}/${BACKUP_FILENAME}..."
docker run --rm \
  -e AWS_ACCESS_KEY_ID="$SCW_ACCESS_KEY" \
  -e AWS_SECRET_ACCESS_KEY="$SCW_SECRET_KEY" \
  -v "$BACKUP_DIR:/backups:ro" \
  "$AWS_CLI_IMAGE" \
  --endpoint-url "$SCW_ENDPOINT" \
  --region "$SCW_REGION" \
  s3 cp "/backups/${BACKUP_FILENAME}" "s3://${SCW_BUCKET_NAME}/${BACKUP_FILENAME}"

echo ">>> Upload OK."

# --- Rotation S3 (supprimer les vieux backups) ---
echo ">>> Rotation S3 (rétention: ${BACKUP_RETENTION_DAYS} jours)..."
CUTOFF_DATE=$(date -d "-${BACKUP_RETENTION_DAYS} days" +%Y-%m-%d)

docker run --rm \
  -e AWS_ACCESS_KEY_ID="$SCW_ACCESS_KEY" \
  -e AWS_SECRET_ACCESS_KEY="$SCW_SECRET_KEY" \
  "$AWS_CLI_IMAGE" \
  --endpoint-url "$SCW_ENDPOINT" \
  --region "$SCW_REGION" \
  s3 ls "s3://${SCW_BUCKET_NAME}/" \
  | awk -v cutoff="$CUTOFF_DATE" '$1 < cutoff {print $4}' \
  | while read -r old_file; do
      echo "    Suppression s3://${SCW_BUCKET_NAME}/${old_file}"
      docker run --rm \
        -e AWS_ACCESS_KEY_ID="$SCW_ACCESS_KEY" \
        -e AWS_SECRET_ACCESS_KEY="$SCW_SECRET_KEY" \
        "$AWS_CLI_IMAGE" \
        --endpoint-url "$SCW_ENDPOINT" \
        --region "$SCW_REGION" \
        s3 rm "s3://${SCW_BUCKET_NAME}/${old_file}"
    done

# --- Rotation locale ---
echo ">>> Rotation locale (rétention: ${BACKUP_LOCAL_RETENTION_DAYS} jours)..."
find "$BACKUP_DIR" -name "nopcommerce_*.dump.gz" -mtime "+${BACKUP_LOCAL_RETENTION_DAYS}" -delete

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "======================================================"
echo "  ✓ Backup terminé en ${DURATION}s"
echo "  Fichier : $BACKUP_FILENAME ($BACKUP_SIZE_HR)"
echo "  S3      : s3://${SCW_BUCKET_NAME}/${BACKUP_FILENAME}"
echo "======================================================"
