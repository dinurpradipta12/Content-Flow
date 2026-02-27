-- Remove 'messages' from hidden_pages in app_config so it's visible to all users globally
UPDATE app_config
SET hidden_pages = (
    SELECT jsonb_agg(page)
    FROM jsonb_array_elements_text(COALESCE(hidden_pages, '[]'::jsonb)) AS page
    WHERE page <> 'messages'
)
WHERE hidden_pages IS NOT NULL
  AND hidden_pages @> '["messages"]'::jsonb;
