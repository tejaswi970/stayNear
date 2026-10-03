-- Optional photos for individual rooms. Safe to run on an existing installation.
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
