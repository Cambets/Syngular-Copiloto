// Vercel Serverless Function: Multi-device user & request synchronization
const MOCK_EMAILS = [
  'vendas@syngular.com.br',
  'suporte@certifica.com.br',
  'parceiro.ar@syngular.com.br'
];

let storedUsers = [];

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Filter out any mock accounts permanently
  storedUsers = storedUsers.filter(su => !MOCK_EMAILS.includes(su.email?.toLowerCase()));

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, users: storedUsers });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { user, users, action, deleteEmail } = body || {};

      if (action === 'delete' && deleteEmail) {
        const clean = deleteEmail.toLowerCase().trim();
        storedUsers = storedUsers.filter(su => su.email?.toLowerCase() !== clean);
        return res.status(200).json({ success: true, count: storedUsers.length, users: storedUsers });
      }

      if (Array.isArray(users)) {
        // Admin full update - clean overwrite
        storedUsers = users.filter(u => !MOCK_EMAILS.includes(u.email?.toLowerCase()));
        return res.status(200).json({ success: true, count: storedUsers.length, users: storedUsers });
      }

      if (user && user.email) {
        const clean = user.email.toLowerCase().trim();
        if (!MOCK_EMAILS.includes(clean)) {
          const idx = storedUsers.findIndex(su => su.email?.toLowerCase() === clean);
          if (idx >= 0) {
            storedUsers[idx] = { ...storedUsers[idx], ...user };
          } else {
            storedUsers.push(user);
          }
        }
        return res.status(200).json({ success: true, count: storedUsers.length, users: storedUsers });
      }

      return res.status(200).json({ success: true, users: storedUsers });
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
