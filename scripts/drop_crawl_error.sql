BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS projects_new (id INTEGER PRIMARY KEY NOT NULL, name VARCHAR(60) NOT NULL, url VARCHAR(1024) NOT NULL, devops_json TEXT, creds TEXT, updated_at TIMESTAMP, UNIQUE(name), CHECK(name <> ''));
INSERT INTO projects_new SELECT id, name, url, devops_json, creds, updated_at FROM projects;
DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;
COMMIT;
