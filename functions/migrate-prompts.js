/**
 * Migration script: Move fullPrompt from main prompt docs to private subcollection
 * 
 * Run with: node functions/migrate-prompts.js
 * 
 * This script:
 * 1. Reads all prompts
 * 2. Copies fullPrompt to prompts/{id}/private/content
 * 3. Removes fullPrompt and prompt fields from the main document
 */

const admin = require("firebase-admin");

// Initialize with application default credentials
admin.initializeApp();

const db = admin.firestore();

async function migrate() {
  console.log("Starting migration...\n");

  const snapshot = await db.collection("prompts").get();
  console.log(`Found ${snapshot.size} prompts to migrate.\n`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const promptId = doc.id;
    const fullPrompt = data.fullPrompt || data.prompt || "";

    if (!fullPrompt) {
      console.log(`  ⏭️  ${promptId} — no fullPrompt, skipping`);
      skipped++;
      continue;
    }

    // Check if already migrated
    const privateRef = db.collection("prompts").doc(promptId).collection("private").doc("content");
    const privateSnap = await privateRef.get();

    if (privateSnap.exists) {
      console.log(`  ✅ ${promptId} — already migrated, skipping`);
      skipped++;
      continue;
    }

    // 1. Write to private subcollection
    await privateRef.set({
      fullPrompt: fullPrompt,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Remove fullPrompt and prompt from the main document
    await doc.ref.update({
      fullPrompt: admin.firestore.FieldValue.delete(),
      prompt: admin.firestore.FieldValue.delete(),
    });

    console.log(`  ✅ ${promptId} — "${data.title}" migrated`);
    migrated++;
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Total:    ${snapshot.size}`);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
