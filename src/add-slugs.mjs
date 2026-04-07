// Migration script: Add slug field to existing prompts
// Usage: node src/add-slugs.mjs

const PROJECT_ID = 'prompt-factory-952f9';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/prompts`;

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

async function migrate() {
    console.log('🔧 Adding slugs to existing prompts...\n');

    const res = await fetch(BASE_URL);
    const data = await res.json();

    if (!data.documents) {
        console.log('No documents found.');
        return;
    }

    for (const doc of data.documents) {
        const name = doc.name;
        const id = name.split('/').pop();
        const title = doc.fields?.title?.stringValue;

        if (!title) {
            console.log(`  ⚠️  Skipping ${id} — no title`);
            continue;
        }

        const slug = generateSlug(title);

        // PATCH to add slug field
        const patchRes = await fetch(
            `https://firestore.googleapis.com/v1/${name}?updateMask.fieldPaths=slug`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: { slug: { stringValue: slug } },
                }),
            }
        );

        if (patchRes.ok) {
            console.log(`  ✅ ${title} → /prompt/${slug}`);
        } else {
            const err = await patchRes.json();
            console.log(`  ❌ ${title} — ${err.error?.message}`);
        }
    }

    console.log('\n🎉 Done! All prompts now have SEO-friendly slugs.');
}

migrate();
