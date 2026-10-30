export default async function handler(req, res) {
  const NOTION_KEY = process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID;

  if (!NOTION_KEY || !DATABASE_ID) {
    return res.status(500).json({ error: "Missing Notion Environment Variables in Vercel" });
  }

  const cleanDbId = DATABASE_ID.replace(/https:\/\/www\.notion\.so\//g, '')
                               .split('?')[0]
                               .replace(/[^a-zA-Z0-9]/g, '');

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${cleanDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_KEY.trim()}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Serverless execution failed", details: error.message });
  }
}
