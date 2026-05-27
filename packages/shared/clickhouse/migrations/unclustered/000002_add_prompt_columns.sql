ALTER TABLE observations_wide
ADD COLUMN IF NOT EXISTS prompt_name String DEFAULT '',
ADD COLUMN IF NOT EXISTS prompt_version String DEFAULT '';
