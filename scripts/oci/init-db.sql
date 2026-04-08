-- FactoryConnect: Database initialization
-- Creates the keycloak schema and enables required extensions

CREATE SCHEMA IF NOT EXISTS keycloak;

-- Extensions needed by FactoryConnect
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
