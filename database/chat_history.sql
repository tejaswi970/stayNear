-- Run this migration in the Supabase SQL Editor for an existing database.
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  pgs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_chat_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE;

DO $$
DECLARE
  old_history RECORD;
  legacy_conversation_id UUID;
BEGIN
  FOR old_history IN
    SELECT user_id, MIN(created_at) AS first_message, MAX(created_at) AS last_message
    FROM ai_chat_messages
    WHERE conversation_id IS NULL
    GROUP BY user_id
  LOOP
    INSERT INTO ai_conversations (user_id, title, created_at, updated_at)
    VALUES (old_history.user_id, 'Previous StayBot chat', old_history.first_message, old_history.last_message)
    RETURNING id INTO legacy_conversation_id;

    UPDATE ai_chat_messages
    SET conversation_id = legacy_conversation_id
    WHERE user_id = old_history.user_id AND conversation_id IS NULL;
  END LOOP;
END $$;

ALTER TABLE ai_chat_messages
  ALTER COLUMN conversation_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated
  ON ai_conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_sequence
  ON ai_chat_messages(user_id, sequence DESC);

NOTIFY pgrst, 'reload schema';