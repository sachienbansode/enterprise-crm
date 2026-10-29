-- 18-llm-transcription.sql — meeting transcription with the LLM provider's key (third fallback after Azure and Groq)
-- Optional: the API applies the same at startup. Safe to run more than once.
ALTER TABLE speech_config ADD COLUMN IF NOT EXISTS llm_transcribe boolean DEFAULT false;
ALTER TABLE speech_config ADD COLUMN IF NOT EXISTS llm_transcribe_model varchar(80) DEFAULT 'whisper-1';
-- Switch it on (or use Admin → Integrations → Meeting Recording):
-- UPDATE speech_config SET llm_transcribe = true WHERE id = 1;
