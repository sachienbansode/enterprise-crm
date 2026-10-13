-- 10-meetings-lost-comment.sql — meeting recording (in-person + Teams) and mandatory lost comment.
-- Optional: the API also creates these at startup. Safe to run more than once.
BEGIN;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_comment text;
CREATE TABLE IF NOT EXISTS meetings (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
       source varchar(20) NOT NULL DEFAULT 'recording',          -- 'recording' | 'teams'
       title varchar(300), client_id uuid REFERENCES clients(id) ON DELETE SET NULL, lead_id uuid, vertical varchar(60),
       organizer_id uuid, organizer_email varchar(200), organizer_name varchar(255),
       start_at timestamptz, end_at timestamptz, duration_sec integer,
       join_url text, graph_event_id text, online_meeting_id text, recording_id text,
       attendees jsonb DEFAULT '[]',                                -- [{key, kind:'user'|'person'|'other', id, name, role}]
       status varchar(20) DEFAULT 'scheduled',                      -- scheduled | recording | transcribing | transcribed | no_transcript | failed
       audio_path text, audio_mime varchar(60), audio_bytes bigint DEFAULT 0, chunks integer DEFAULT 0,
       segments jsonb DEFAULT '[]',                                 -- [{s: speakerKey, t0, t1, text}]
       speakers jsonb DEFAULT '{}',                                 -- {speakerKey: {name, attendee, confidence, confirmed}}
       transcript_source varchar(30), summary jsonb, interaction_id uuid, error text, attempts integer DEFAULT 0,
       consent_by varchar(255), consent_at timestamptz,
       created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
     );
CREATE INDEX IF NOT EXISTS idx_meetings_client ON meetings (client_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings (status, end_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_meetings_event ON meetings (graph_event_id) WHERE graph_event_id IS NOT NULL;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS meeting_id uuid;
CREATE TABLE IF NOT EXISTS speech_config (
       id integer PRIMARY KEY DEFAULT 1, enabled boolean DEFAULT false, endpoint text, api_key text,
       api_version varchar(20) DEFAULT '2024-11-15', locales text[] DEFAULT ARRAY['en-IN','hi-IN'], max_speakers integer DEFAULT 6,
       teams_auto_fetch boolean DEFAULT true, keep_audio_days integer DEFAULT 90,
       updated_by varchar(255), updated_at timestamptz DEFAULT now()
     );
INSERT INTO speech_config (id) VALUES (1) ON CONFLICT DO NOTHING;
COMMIT;
