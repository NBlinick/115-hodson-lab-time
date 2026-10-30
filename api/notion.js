export default async function handler(req, res) {
  // Read API key and Database ID from Vercel environment variables
  const apiKey = (process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY || '').trim();
  const rawDbId = (process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID || '').trim();

  // Strip anything that is NOT a hex character (a-f, A-F, 0-9)
  const cleanDbId = rawDbId.replace(/[^a-fA-F0-9]/g, '');

  if (!apiKey) {
    return res.status(400).json({ 
      message: "NOTION_API_KEY is missing in Vercel Environment Variables." 
    });
  }

  if (cleanDbId.length !== 32) {
    return res.status(400).json({ 
      message: `Database ID is invalid (${cleanDbId.length} hex chars instead of 32). Cleaned ID value: "${cleanDbId}"` 
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
      body: JSON.stringify({})
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return res.status(notionRes.status).json({
        message: data.message || `Notion API rejected request with HTTP ${notionRes.status}`,
        code: data.code || 'NOTION_REJECTION',
        details: data
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: "Serverless function error: " + err.message });
  }
}
