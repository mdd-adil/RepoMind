CREATE TABLE IF NOT EXISTS repositories (
  id SERIAL PRIMARY KEY,
  repo_url VARCHAR(500) UNIQUE,
  name VARCHAR(255) NOT NULL,
  owner VARCHAR(255) DEFAULT 'local',
  description TEXT,
  stars INTEGER DEFAULT 0,
  default_branch VARCHAR(100) DEFAULT 'main',
  primary_language VARCHAR(100),
  architecture_overview TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  path VARCHAR(500) NOT NULL,
  name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  layer VARCHAR(50) DEFAULT 'other',
  size_bytes INTEGER DEFAULT 0,
  loc INTEGER DEFAULT 0,
  summary TEXT,
  deep_explanation TEXT,
  symbols JSONB DEFAULT '[]'::jsonb,
  raw_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_repo_module_path UNIQUE(repo_id, path)
);

CREATE TABLE IF NOT EXISTS module_dependencies (
  id SERIAL PRIMARY KEY,
  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  source_module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  target_module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  import_specifiers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_repo_dependency UNIQUE(repo_id, source_module_id, target_module_id)
);

CREATE INDEX IF NOT EXISTS idx_modules_repo_id ON modules(repo_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_repo_id ON module_dependencies(repo_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON module_dependencies(source_module_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON module_dependencies(target_module_id);
