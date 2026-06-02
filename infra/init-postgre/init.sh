#!/usr/bin/env bash
# 02-app-user.sh — Crée l'utilisateur applicatif nopCommerce (non-superuser)
# Exécuté par PostgreSQL uniquement à la 1ère initialisation de la base.
set -e

# Le mot de passe est passé via la variable d'environnement APP_DB_PASSWORD
APP_PASSWORD="${NOP_DB_PASSWORD}"
# Échappement des guillemets simples pour l'injection SQL
APP_PASSWORD_ESC="${NOP_DB_PASSWORD//\'/\'\'}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE USER "${NOP_DB_USER}" WITH NOSUPERUSER NOCREATEDB NOCREATEROLE LOGIN ENCRYPTED PASSWORD '${APP_PASSWORD_ESC}';
  CREATE DATABASE "${NOP_DB_NAME}" OWNER "${NOP_DB_USER}";
  GRANT ALL ON SCHEMA public TO "${NOP_DB_USER}";
EOSQL
