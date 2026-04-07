/**
 * Migration script: Move fullPrompt from main prompt docs to private subcollection
 * Uses Firebase REST API with the project's web API key
 * 
 * Run with: node functions/migrate-prompts-rest.js
 */

const API_KEY = "AIzaSyBeHQcbws1bourncno_mSu1IAIWYVVz5iU";
const PROJECT_ID = "prompt-factory-952f9";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function migrate() {
  console.log("Starting REST-based migration...\n");

  // 1. Fetch all prompts
  let allDocs = [];
  let nextPageToken = null;

  do {
    const url = nextPageToken
      ? `${BASE_URL}/prompts?pageSize=100&pageToken=${nextPageToken}`
      : `${BASE_URL}/prompts?pageSize=100`;
    
    const resp = await fetch(url);
    const data = await resp.json();
    
    if (data.documents) {
      allDocs = allDocs.concat(data.documents);
    }
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);

  console.log(`Found ${allDocs.length} prompts\n`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of allDocs) {
    const docPath = doc.name; // full path
    const docId = docPath.split('/').pop();
    const fields = doc.fields || {};
    
    const title = fields.title?.stringValue || 'Untitled';
    const fullPrompt = fields.fullPrompt?.stringValue || fields.prompt?.stringValue || '';

    if (!fullPrompt) {
      console.log(`  ⏭️  ${docId} — "${title}" — no fullPrompt, skipping`);
      skipped++;
      continue;
    }

    // Check if private/content already exists
    const privateUrl = `${BASE_URL}/prompts/${docId}/private/content`;
    const checkResp = await fetch(privateUrl);
    
    if (checkResp.ok) {
      console.log(`  ✅ ${docId} — "${title}" — already migrated`);
      skipped++;
      continue;
    }

    // Write to private/content subcollection via direct PATCH
    const createUrl = `${BASE_URL}/prompts/${docId}/private/content`;
    const createResp = await fetch(createUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          fullPrompt: { stringValue: fullPrompt },
        },
      }),
    });

    if (!createResp.ok) {
      const err = await createResp.text();
      console.log(`  ❌ ${docId} — "${title}" — WRITE FAILED: ${err}`);
      continue;
    }

    // Remove fullPrompt and prompt fields from main doc using updateMask
    const updateUrl = `${BASE_URL}/prompts/${docId}?updateMask.fieldPaths=fullPrompt&updateMask.fieldPaths=prompt`;
    
    // Build a copy of existing fields WITHOUT fullPrompt and prompt
    const cleanFields = { ...fields };
    delete cleanFields.fullPrompt;
    delete cleanFields.prompt;
    
    // We need to update with only the mask fields removed
    // Firebase REST API: if updateMask is set but the field isn't in the body, it gets deleted
    const updateResp = await fetch(`${BASE_URL}/prompts/${docId}?updateMask.fieldPaths=fullPrompt&updateMask.fieldPaths=prompt`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {},
      }),
    });

    if (!updateResp.ok) {
      const err = await updateResp.text();
      console.log(`  ⚠️  ${docId} — "${title}" — migrated content but failed to clean main doc: ${err}`);
    } else {
      console.log(`  ✅ ${docId} — "${title}" — migrated & cleaned`);
    }

    migrated++;
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Total:    ${allDocs.length}`);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
