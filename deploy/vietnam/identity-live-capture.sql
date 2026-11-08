alter table public.kyc_photo_sessions add column if not exists challenge_poses jsonb;
notify pgrst,'reload schema';
