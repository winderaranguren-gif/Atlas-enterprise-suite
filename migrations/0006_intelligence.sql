CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (dba_id) REFERENCES dbas(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_scope_updated
ON ai_conversations(organization_id,dba_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  provider_response_id TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (dba_id) REFERENCES dbas(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created
ON ai_messages(conversation_id,created_at);
CREATE INDEX IF NOT EXISTS idx_ai_messages_scope
ON ai_messages(organization_id,dba_id,conversation_id);
