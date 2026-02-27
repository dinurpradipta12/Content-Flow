-- Remove 'messages' from hidden_pages in app_config so it's visible to all users globally
-- hidden_pages is a text[] column, use array_remove()
UPDATE app_config
SET hidden_pages = array_remove(hidden_pages, 'messages');
