-- Add mood column to companion_config
ALTER TABLE companion_config 
ADD COLUMN mood text NOT NULL DEFAULT 'supportive';

-- Add a comment to describe valid moods
COMMENT ON COLUMN companion_config.mood IS 'Current mood of the companion: supportive, happy, playful, thoughtful, empathetic, excited, calm, curious';