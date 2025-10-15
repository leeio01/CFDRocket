require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

async function createAdmin() {
  try {
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    const name = "Admin";
    const email = "admin@cfdrocket.com"; // must match backend field
    const password = "admin123";
    const role = "superadmin";

    // Insert admin user
    const result = await db.collection("users").insertOne({
      name,
      email,      // must match backend login field
      password,   // plain text (backend expects plain text)
      role,
      createdAt: new Date()
    });

    console.log("✅ Admin user created successfully!");
    console.log(result);

    client.close();
  } catch (err) {
    console.error("❌ Error creating admin:", err);
  }
}

createAdmin();
