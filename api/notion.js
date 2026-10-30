export default async function handler(req, res) {
  const apiKey = (process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY || '').trim();
  const rawDbId = (process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID || '').trim();

  const cleanDbId = rawDbId.replace(/[^a-fA-F0-9]/g, '');

  if (!apiKey || cleanDbId.length !== 32) {
    return res.status(400).json({ 
      message: "Missing or invalid Notion credentials in Vercel environment variables." 
    });
  }

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${cleanDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          property: "Include in App",
          checkbox: {
            equals: true
          }
        }
      })
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return res.status(notionRes.status).json({
        message: data.message || `Notion API error (${notionRes.status})`,
        details: data
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: "Serverless function error: " + err.message });
  }
}