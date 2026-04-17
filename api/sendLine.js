export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, flexMessage } = req.body;

  // รหัส API ของคุณครับ
  const LINE_CHANNEL_ACCESS_TOKEN = 'ynJmpPJi1I0wvSFGkPF3WSz32lhUrUpBIlMoYPLpYkMIRpvm4bHzIIX5oAAW8GS5lUCqXEmV5/yOWT7vzI+83j6QOam+0F7nygLzzGf7OWOmbqc8WlFOF3MorsY8LJ5zwAH80kzCe/jolrXvqK6WNQdB04t89/1O/w1cDnyilFU=';

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [flexMessage]
      })
    });

    const data = await response.json();
    res.status(200).json({ success: true, result: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}