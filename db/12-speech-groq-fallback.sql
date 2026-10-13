-- 12-speech-groq-fallback.sql — free Groq Whisper fallback for meeting transcription.
-- Optional: the API applies the same change at startup. Safe to run more than once.
ALTER TABLE speech_config ADD COLUMN IF NOT EXISTS groq_api_key text;
ALTER TABLE speech_config ADD COLUMN IF NOT EXISTS groq_model varchar(60) DEFAULT 'whisper-large-v3';
