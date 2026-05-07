const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

async function migrate() {
  console.log("Starting shortCode migration...\n");

  const snapshot = await db.collection("prompts").orderBy("createdAt", "asc").get();
  console.log(`Found ${snapshot.size} prompts to migrate.\n`);

  let migrated = 0;
  let skipped = 0;
  let counter = 1;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const promptId = doc.id;

    if (data.shortCode) {
      console.log(`  ⏭️  ${promptId} — already has shortCode ${data.shortCode}, skipping`);
      skipped++;
      counter = Math.max(counter, parseInt(data.shortCode.replace("PRO", "")) + 1);
      continue;
    }

    const shortCode = `PRO${counter.toString().padStart(3, '0')}`;
    
    await doc.ref.update({
      shortCode: shortCode
    });

    console.log(`  ✅ ${promptId} — assigned ${shortCode}`);
    migrated++;
    counter++;
  }

  // Update the latest counter in the counters collection
  const counterRef = db.collection('counters').doc('promptCode');
  await counterRef.set({ current: counter - 1 }, { merge: true });

  console.log(`\n✅ Migration complete!`);
  console.log(`   Migrated:  ${migrated}`);
  console.log(`   Skipped:   ${skipped}`);
  console.log(`   Next code: PRO${counter.toString().padStart(3, '0')}`);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
