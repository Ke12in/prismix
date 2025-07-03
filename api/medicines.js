const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  cachedClient = client;
  return client;
}

module.exports = async (req, res) => {
  if (!uri) {
    res.status(500).json({ error: 'Missing MONGODB_URI env variable' });
    return;
  }
  try {
    const client = await connectToDatabase();
    const db = client.db(); // Uses the db name from your connection string
    const medicines = db.collection('medicines'); // Or 'Drug Shop' if you want

    if (req.method === 'GET') {
      // Return all medicines
      const all = await medicines.find({}).toArray();
      res.status(200).json(all);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};