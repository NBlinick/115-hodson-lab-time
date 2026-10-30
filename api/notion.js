export default async function handler(req, res) {
  const NOTION_KEY = (process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY || '').trim();
  const rawDbId = (process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID || '').trim();

  if (!NOTION_KEY || !rawDbId) {
    return res.status(400).json({ 
      message: "Missing environment variables. Check NOTION_API_KEY and NOTION_DATABASE_ID in Vercel." 
    });
  }

  // Extract clean 32-character hexadecimal string
  const cleanDbId = rawDbId.replace(/[^a-fA-F0-9]/g, '');

  if (cleanDbId.length !== 32) {
    return res.status(400).json({ 
      message: `Invalid Database ID length (${cleanDbId.length} chars). Must be exactly 32 hex characters.` 
    });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${cleanDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: data.message || `Notion API rejected request with status ${response.status}`,
        code: data.code || 'NOTION_API_ERROR'
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Serverless execution failed: " + error.message });
  }
}
