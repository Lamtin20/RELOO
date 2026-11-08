alter table short_video_media add column if not exists edit_instructions jsonb not null default '{}';
