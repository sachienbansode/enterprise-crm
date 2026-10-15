-- 13-ai-conversations.sql — saved NIYTRI AI chats (each user sees only their own).
-- Optional: the API applies the same change at startup. Safe to run more than once.
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid NOT NULL, title varchar(200) NOT NULL DEFAULT 'New chat',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations (user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role varchar(10) NOT NULL, text text NOT NULL, meta jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages (conversation_id, created_at);
