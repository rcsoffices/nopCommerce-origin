#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# migrate-sql-to-postgres.sh — Migration Azure SQL → PostgreSQL via pgloader
#
# Usage : ./migrate-sql-to-postgres.sh <MSSQL_CONN> <PG_CONN>
#
# Arguments:
#   MSSQL_CONN  — pgloader MSSQL DSN
#                 Format : mssql://username:password@server.database.windows.net/dbname
#   PG_CONN     — pgloader PostgreSQL DSN
#                 Format : postgresql://nop:password@localhost:5432/nopcommerce
#
# Prérequis:
#   - Docker installé et accessible
#   - L'utilisateur SQL Azure doit utiliser SQL auth (pas AAD-only)
#     → Créer un SQL login temporaire si azuread_authentication_only=true :
#       CREATE LOGIN migrate_user WITH PASSWORD = '...'
#       CREATE USER migrate_user FOR LOGIN migrate_user
#       ALTER ROLE db_datareader ADD MEMBER migrate_user
#   - PostgreSQL container (nopcommerce) en cours d'exécution
#   - Base nopcommerce déjà créée dans PostgreSQL
# =============================================================================

MSSQL_CONN="${1:-}"
PG_CONN="${2:-}"
LOAD_FILE="/tmp/nop_migration_$$.load"
PGLOADER_IMAGE="dimitri/pgloader:latest"

# --- Validation des arguments ---
if [[ -z "$MSSQL_CONN" || -z "$PG_CONN" ]]; then
  echo "Usage: $0 <MSSQL_CONN> <PG_CONN>" >&2
  echo ""
  echo "  MSSQL_CONN : mssql://username:password@server.database.windows.net/dbname"
  echo "  PG_CONN    : postgresql://nop:password@localhost:5432/nopcommerce"
  exit 1
fi

echo "======================================================"
echo "  Migration Azure SQL → PostgreSQL"
echo "  Source : ${MSSQL_CONN%%:*}://***@${MSSQL_CONN##*@}"
echo "  Dest   : ${PG_CONN%%:*}://***@${PG_CONN##*@}"
echo "======================================================"

# --- Génération du fichier pgloader .load ---
cat > "$LOAD_FILE" <<EOF
LOAD DATABASE
  FROM      ${MSSQL_CONN}
  INTO      ${PG_CONN}

WITH include no drop,
     create tables,
     create indexes,
     reset sequences,
     foreign keys,
     downcase identifiers

CAST
  type uniqueidentifier to uuid    using mssql-uniqueidentifier-to-uuid,
  type bit              to boolean using mssql-bit-to-boolean,
  type tinyint          to smallint,
  type float            to double precision,
  type datetime         to timestamp,
  type datetime2        to timestamp,
  type ntext            to text,
  type nvarchar         to text,
  type varchar          to text,
  type xml              to text

EXCLUDING TABLE NAMES MATCHING '__*', 'sysdiagrams'

SET work_mem                 to '256MB',
    maintenance_work_mem     to '512MB',
    search_path              to 'public'

BEFORE LOAD DO
\$\$ CREATE SCHEMA IF NOT EXISTS public; \$\$;
EOF

echo ">>> Fichier de migration généré : $LOAD_FILE"

# --- Exécution pgloader ---
echo ">>> Lancement pgloader (image: $PGLOADER_IMAGE)..."
START_TIME=$(date +%s)

docker run --rm \
  --network host \
  -v /tmp:/tmp \
  "$PGLOADER_IMAGE" \
  pgloader --verbose "$LOAD_FILE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo ">>> pgloader terminé en ${DURATION}s"

# --- Vérification des séquences ---
echo ""
echo ">>> Vérification et correction des séquences PostgreSQL..."

# Extraire host/port/db/user depuis PG_CONN
PG_CONN_CLEAN="${PG_CONN#postgresql://}"
PG_USER="${PG_CONN_CLEAN%%:*}"
PG_REST="${PG_CONN_CLEAN#*:}"
PG_PASS="${PG_REST%%@*}"
PG_HOST_DB="${PG_REST#*@}"
PG_HOST="${PG_HOST_DB%%/*}"
PG_DB="${PG_HOST_DB##*/}"
PG_HOST_ONLY="${PG_HOST%%:*}"
PG_PORT="${PG_HOST##*:}"
if [[ "$PG_PORT" == "$PG_HOST_ONLY" ]]; then PG_PORT=5432; fi

# Requête SQL pour remettre à jour toutes les séquences
FIX_SEQUENCES_SQL=$(cat <<'SQL'
DO $$
DECLARE
  seq_rec RECORD;
  max_val BIGINT;
  seq_name TEXT;
BEGIN
  FOR seq_rec IN
    SELECT
      s.relname AS seq_name,
      t.relname AS table_name,
      a.attname AS col_name
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass
    JOIN pg_class t ON t.oid = d.refobjid AND t.relkind = 'r'
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S'
  LOOP
    EXECUTE format('SELECT MAX(%I) FROM %I', seq_rec.col_name, seq_rec.table_name) INTO max_val;
    IF max_val IS NOT NULL THEN
      EXECUTE format('SELECT setval(%L, %s)', seq_rec.seq_name, max_val);
    END IF;
  END LOOP;
END;
$$;
SQL
)

PGPASSWORD="$PG_PASS" docker exec -i \
  "$(docker ps --filter name=postgres --format '{{.Names}}' | head -1)" \
  psql -U "$PG_USER" -d "$PG_DB" -c "$FIX_SEQUENCES_SQL" \
  && echo ">>> Séquences mises à jour."

# --- Résumé ---
echo ""
echo "======================================================"
echo "  ✓ Migration terminée en ${DURATION}s"
echo ""
echo "  Prochaines étapes :"
echo "  1. Vérifier le log pgloader ci-dessus (0 erreur attendu)"
echo "  2. Mettre à jour App_Data/dataSettings.json :"
echo "     - DataProvider  : \"postgresql\""
echo "     - ConnectionString: \"User Id=${PG_USER};Password=xxx;Host=${PG_HOST_ONLY};Port=${PG_PORT};Database=${PG_DB};\""
echo "  3. Supprimer le SQL login temporaire sur Azure SQL"
echo "  4. Re-activer azuread_authentication_only=true dans sql.tf"
echo "======================================================"

# --- Nettoyage ---
rm -f "$LOAD_FILE"
