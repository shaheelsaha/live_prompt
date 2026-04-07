// Seed script: Delete old prompts, add AI generation prompts
// Usage: node src/seed-rest.mjs

const PROJECT_ID = 'prompt-factory-952f9';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/prompts`;

// Step 1: Delete all existing prompts
async function deleteAll() {
    console.log('🗑️  Deleting old prompts...\n');
    const res = await fetch(BASE_URL);
    const data = await res.json();
    if (data.documents) {
        for (const doc of data.documents) {
            const name = doc.name;
            const delRes = await fetch(`https://firestore.googleapis.com/v1/${name}`, { method: 'DELETE' });
            if (delRes.ok) {
                const id = name.split('/').pop();
                console.log(`  ❌ Deleted: ${id}`);
            }
        }
    }
    console.log('');
}

// Step 2: Seed new AI prompts
const prompts = [
    {
        title: 'Cinematic Portrait — Dramatic Lighting',
        category: 'Image Generation',
        platform: 'Midjourney',
        promptType: 'image',
        problem: 'Create a photorealistic cinematic portrait with dramatic studio lighting and film grain.',
        before: '',
        after: '',
        price: 3,
        impressions: 24500,
        likes: 3200,
        fullPrompt: 'portrait of a woman in her 30s, looking slightly to the left, dramatic Rembrandt lighting from the right, deep shadows on the left side of her face, soft bokeh background in warm amber tones, shot on 85mm f/1.4 lens, Kodak Portra 400 film stock, visible film grain, subtle catch light in eyes, natural skin texture, muted earth tone wardrobe --ar 3:4 --v 6 --style raw',
        instructions: '1. Open Midjourney and type /imagine\n2. Paste the full prompt exactly as written\n3. For best results, use --v 6 (version 6) and --style raw\n4. Adjust --ar (aspect ratio) to 3:4 for portrait orientation\n5. If you want a different subject, replace the description but keep the lighting and camera settings\n6. Use "vary (subtle)" on the best result for refined variations',
        tutorialLink: '',
        outputMedia: '',
        outputMediaType: 'image',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'Product Mockup — Floating in Studio',
        category: 'Image Generation',
        platform: 'DALL-E',
        promptType: 'image',
        problem: 'Generate a clean, professional product mockup with a floating effect and minimal studio background.',
        before: '',
        after: '',
        price: 3,
        impressions: 18700,
        likes: 2100,
        fullPrompt: 'A minimalist product photography shot of a matte black wireless headphone floating in mid-air at a slight angle, casting a soft diffused shadow below. Clean white cyclorama studio background. Three-point lighting setup with key light from upper right, fill light from left, and rim light from behind creating a subtle edge glow. Shot with a Canon EOS R5, 100mm macro lens, f/8, studio strobe lighting. Ultra sharp details, no text or watermarks. 8K resolution quality.',
        instructions: '1. Open ChatGPT and switch to DALL-E mode (or use the DALL-E API)\n2. Paste the full prompt\n3. Replace "matte black wireless headphone" with your product\n4. Keep the lighting description for consistent studio quality\n5. Request "no text or watermarks" to keep the output clean\n6. Download the highest resolution version available',
        tutorialLink: '',
        outputMedia: '',
        outputMediaType: 'image',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'Viral Drone Shot — Golden Hour Cityscape',
        category: 'Video Generation',
        platform: 'Sora',
        promptType: 'video',
        problem: 'Create a cinematic aerial drone shot flying through a modern city skyline at golden hour.',
        before: '',
        after: '',
        price: 5,
        impressions: 52000,
        likes: 8900,
        fullPrompt: 'A cinematic drone shot that starts low between modern glass skyscrapers, gradually ascending while rotating 180 degrees to reveal a sprawling city skyline at golden hour. Warm sunlight reflects off building windows creating lens flares. Tiny cars move on streets far below. A few wispy clouds catch the orange and pink sunset colors. Camera movement is smooth and steady, similar to a DJI Inspire 3 with a Zenmuse X9 gimbal. The shot continues upward until the entire downtown area is visible, ending with the sun on the horizon. Anamorphic lens distortion, cinematic color grading with teal shadows and warm highlights.',
        instructions: '1. Sign in to Sora at sora.com\n2. Paste the full prompt in the text field\n3. Select "16:9 widescreen" for the aspect ratio\n4. Choose the longest duration available (20+ seconds recommended)\n5. For the smoothest camera movement, mention specific gimbal equipment\n6. Generate multiple variations and pick the best camera path\n7. Download in the highest available resolution',
        tutorialLink: '',
        outputMedia: '',
        outputMediaType: 'video',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'Nature Documentary — Underwater Coral Reef',
        category: 'Video Generation',
        platform: 'Veo',
        promptType: 'video',
        problem: 'Generate a stunning underwater documentary sequence of a coral reef teeming with marine life.',
        before: '',
        after: '',
        price: 5,
        impressions: 38000,
        likes: 6400,
        fullPrompt: 'An underwater documentary sequence filmed at a vibrant coral reef in crystal clear tropical water. The camera slowly glides forward at reef level, passing colorful coral formations in pink, purple, and orange. Schools of small yellow fish swim in synchronized formation around staghorn coral. A sea turtle enters from the right side and swims diagonally across the frame. Sunlight rays penetrate from the surface creating volumetric god rays through the water. Natural underwater color grading with deep blues and vivid coral colors. Shot on a RED V-Raptor in a Nauticam housing with a 14mm wide angle lens. Shallow depth of field with the turtle in sharp focus. Gentle water current causing soft movement in sea fans and anemones.',
        instructions: '1. Open Google Veo (via Gemini or the Veo API)\n2. Paste the full prompt\n3. Select "cinematic" mode for the highest quality output\n4. Request 16:9 aspect ratio\n5. The camera equipment mentions help the AI understand the visual style\n6. For different marine scenes, swap the coral/fish descriptions\n7. Add "David Attenborough style" to the prompt for a more documentary feel',
        tutorialLink: '',
        outputMedia: '',
        outputMediaType: 'video',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'Anime Character Design — Studio Ghibli Style',
        category: 'Image Generation',
        platform: 'Stable Diffusion',
        promptType: 'image',
        problem: 'Create a detailed anime character design in the style of Studio Ghibli films with a natural background.',
        before: '',
        after: '',
        price: 3,
        impressions: 31000,
        likes: 5600,
        fullPrompt: 'a young adventurer girl, 16 years old, standing on a grassy hilltop overlooking a vast valley with floating islands in the distance, studio ghibli art style, hayao miyazaki inspired, wearing a blue tunic with a brown leather satchel, wind blowing through her short auburn hair, determined expression, holding an antique compass, puffy cumulus clouds in a bright blue sky, wildflowers around her feet, warm afternoon sunlight, hand-painted watercolor texture, cel shading, detailed background with a distant medieval town, birds flying in formation, masterpiece quality, 4k resolution',
        instructions: '1. Use Stable Diffusion with the "Anything V5" or "Counterfeit V3" model\n2. Paste the full prompt in the positive prompt field\n3. Negative prompt: "realistic, photorealistic, 3d render, bad anatomy, deformed hands, extra fingers"\n4. Settings: Steps 30, CFG Scale 7, Sampler DPM++ 2M Karras\n5. Resolution: 768x1024 for portrait orientation\n6. Use the Hi-Res Fix for sharper details\n7. To change the character, modify the description but keep the style keywords',
        tutorialLink: '',
        outputMedia: '',
        outputMediaType: 'image',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'Creative Story — Fantasy World Builder',
        category: 'Text Generation',
        platform: 'Gemini',
        promptType: 'text',
        problem: 'Generate an immersive, detailed fantasy world description with history, geography, and cultures for creative writing.',
        before: '',
        after: '',
        price: 3,
        impressions: 15000,
        likes: 1800,
        fullPrompt: 'You are a master world-builder and fantasy author. Create a detailed, immersive fantasy world with the following specifications:\n\n**World Name**: Generate a unique, pronounceable name\n\n**Geography**: Describe 5 distinct regions with unique biomes (at least one must be entirely original/fantastical). Include a hand-drawn style map description.\n\n**History**: Write a 500-year timeline with 3 major eras, including:\n- A founding myth\n- A great war or cataclysm\n- A current political tension\n\n**Cultures**: Create 3 distinct civilizations with:\n- Unique naming conventions\n- Social hierarchies\n- One unusual custom that would surprise a visitor\n- How they view magic/technology\n\n**Magic System**: Design a magic system with clear rules, limitations, and costs. It must have at least one clever limitation that creates interesting story conflicts.\n\n**Current Conflict**: A simmering tension that could erupt into the main plot of a novel.\n\nWrite this as an engaging reference document, not a dry encyclopedia entry. Use vivid language and occasional in-world quotes.',
        instructions: '1. Open Gemini (gemini.google.com) or use the API\n2. Paste the full prompt\n3. The output will be 2000-3000 words — let it generate fully\n4. To customize: change the number of regions, cultures, or add specific themes\n5. Follow up with: "Now write Chapter 1 set in [region name]" to start your story\n6. Ask Gemini to create character profiles that fit naturally into this world',
        tutorialLink: '',
        outputMedia: '',
        outputMediaType: 'image',
        beforeImage: '',
        afterImage: '',
    },
];

function toFirestoreFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            fields[key] = { stringValue: value };
        } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                fields[key] = { integerValue: String(value) };
            } else {
                fields[key] = { doubleValue: value };
            }
        }
    }
    fields.createdAt = { timestampValue: new Date().toISOString() };
    return fields;
}

async function seed() {
    await deleteAll();

    console.log('🌱 Seeding AI generation prompts...\n');
    for (const prompt of prompts) {
        try {
            const res = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: toFirestoreFields(prompt) }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(JSON.stringify(err.error));
            }
            const data = await res.json();
            const id = data.name.split('/').pop();
            console.log(`✅ Added: "${prompt.title}" (${id})`);
        } catch (err) {
            console.error(`❌ Failed: "${prompt.title}"`, err.message);
        }
    }
    console.log('\n🎉 Done! Check your homepage.');
}

seed();
