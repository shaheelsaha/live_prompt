// Seed script using Firebase Admin SDK (bypasses security rules)
// Usage: npx tsx src/seed.ts

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize with project ID only (no service account needed for Firestore emulator-like access)
// This uses Application Default Credentials or falls back to project-level access
const app = initializeApp({
    projectId: 'prompt-factory-952f9',
});

const db = getFirestore(app);

const prompts = [
    {
        title: 'The Counter-Narrative Opener',
        category: 'LinkedIn Hook',
        platform: 'LinkedIn',
        promptType: 'text',
        problem: 'Standard "I am excited to announce" posts get ignored by the algorithm.',
        before: '"I am thrilled to announce that we just launched our new feature. It took 3 months of hard work..."',
        after: '"Everything you\'ve been told about feature launches is wrong. We spent 3 months doing the exact opposite of what the \'experts\' recommend. Here is why..."',
        price: 3,
        impressions: 14200,
        likes: 890,
        fullPrompt: `Write a LinkedIn post that opens with a bold, contrarian statement that challenges a widely accepted belief in your industry. Follow this formula:

1. HOOK: Start with "Everything you've been told about [TOPIC] is wrong." or "I did the opposite of what every expert recommends. Here's what happened."

2. STORY: Share a specific, personal experience where the conventional wisdom failed you. Include real numbers, timelines, and outcomes.

3. LESSON: Reveal the counterintuitive insight you discovered. Frame it as a secret most people don't know.

4. PROOF: Back it up with 2-3 specific data points or results.

5. CTA: End with a thought-provoking question that invites comments. Example: "What's one piece of 'expert advice' you've completely ignored — and it worked?"

Rules:
- Keep sentences short (under 15 words)
- Use line breaks between every 1-2 sentences
- No hashtags in the first 3 lines
- Open with a statement, never a question`,
        instructions: `1. Pick a topic where you went against conventional wisdom
2. Replace [TOPIC] with your industry/niche
3. Write your real story with specific numbers
4. Keep the post between 150-250 words
5. Post between 8-10 AM on Tuesday, Wednesday, or Thursday for max reach
6. Reply to every comment within the first hour`,
        tutorialLink: '',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'The "Tear Down" Framework',
        category: 'X Thread',
        platform: 'X (Twitter)',
        promptType: 'text',
        problem: 'Boring how-to threads get zero engagement and die in the feed.',
        before: '"Here are 5 tips on how to improve your landing page conversion rate..."',
        after: '"I just analyzed 100 landing pages from YC top startups. 95% of them use this exact same psychological trigger. A teardown 🧵"',
        price: 3,
        impressions: 32500,
        likes: 2100,
        fullPrompt: `Write an X/Twitter thread using the "Teardown" framework. You'll analyze real examples from top companies to teach a lesson.

Thread structure (8-12 tweets):

TWEET 1 (HOOK):
"I just analyzed [NUMBER] [THINGS] from [CREDIBLE SOURCE]. [PERCENTAGE]% of them use this exact same [TECHNIQUE]. A teardown 🧵"

TWEET 2 (CONTEXT):
Explain WHY you did this analysis. What question were you trying to answer?

TWEETS 3-9 (EXAMPLES):
For each example:
- Name the company/person
- Screenshot or describe what they did
- Explain the psychological principle behind it
- Show the result/impact

TWEET 10 (PATTERN):
"The pattern is clear: [ONE SENTENCE SUMMARY]"

TWEET 11 (ACTIONABLE):
"Here's how to apply this yourself in 3 steps:"
1. [Step]
2. [Step]
3. [Step]

TWEET 12 (CTA):
"If you found this useful, RT the first tweet. Follow me for more breakdowns like this every [DAY]."

Rules:
- First tweet must create curiosity
- Use numbers and specifics, never vague claims
- Include at least 3 real examples
- Every tweet should be self-contained and valuable`,
        instructions: `1. Pick a niche: landing pages, emails, ads, pitch decks, etc.
2. Actually research 10-20 real examples (screenshot them)
3. Find the common pattern
4. Write each tweet as a standalone insight
5. Post the thread between 9-11 AM EST on weekdays
6. After posting, reply to your own thread with bonus examples`,
        tutorialLink: '',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'The "No BS" Outreach',
        category: 'Cold Email',
        platform: 'Email',
        promptType: 'text',
        problem: 'Long, generic sales emails go straight to spam — zero replies.',
        before: '"Hi Name, I hope this finds you well. I am reaching out to see if you have 15 minutes to discuss synergies..."',
        after: '"Hey [Name], I noticed [Company] is scaling its sales team. We built a tool that automates lead enrichment. Open to a 2 min video showing how it works?"',
        price: 3,
        impressions: 8700,
        likes: 420,
        fullPrompt: `Write a cold outreach email using the "No BS" framework. This email should be under 75 words and get a reply within 48 hours.

Structure:

SUBJECT LINE (max 5 words):
Use one of these formats:
- "[Name], quick question"
- "Saw [Company]'s [recent thing]"
- "[Mutual connection] suggested I reach out"

LINE 1 — PERSONAL OBSERVATION:
"Hey [Name], I noticed [SPECIFIC THING about their company]."
This must be genuinely researched. Reference their recent hire, product launch, funding, or content.

LINE 2 — VALUE BRIDGE:
"We built [TOOL/SERVICE] that helps [TYPE OF COMPANY] [ACHIEVE SPECIFIC RESULT]."
Be concrete. Include a metric if possible.

LINE 3 — LOW-FRICTION CTA:
"Open to a 2-min video showing how it works?"
Never ask for a 30 min call in a cold email. Make it easy to say yes.

Rules:
- NEVER start with "I hope this finds you well"
- NEVER use the word "synergies"
- Keep the entire email under 75 words
- Use their first name, not "Dear Sir/Madam"
- Send between Tue-Thu, 7-9 AM their timezone`,
        instructions: `1. Research the prospect's company for 2 minutes (LinkedIn, their website, recent news)
2. Find one specific, relevant thing to mention
3. Replace all bracketed placeholders
4. Keep it under 75 words — seriously, count them
5. Send Tue-Thu at 7-9 AM in their timezone
6. Follow up exactly 3 days later with a one-line bump: "Hey [Name], thoughts on this?"`,
        tutorialLink: '',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'The "Pattern Interrupt" Reel Script',
        category: 'Reel Script',
        platform: 'Instagram',
        promptType: 'text',
        problem: 'Generic motivational captions get skipped in 0.5 seconds.',
        before: '"5 tips for growing your business this year! 💪 #entrepreneur #grind"',
        after: '"STOP scrolling. Your bio is losing you clients right now. Here\'s the 3-second fix nobody talks about..."',
        price: 3,
        impressions: 45000,
        likes: 5200,
        fullPrompt: `Write a 30-60 second Instagram Reel script using the "Pattern Interrupt" framework. This script is designed to stop the scroll in under 1 second.

SCRIPT STRUCTURE:

SECOND 0-2 (PATTERN INTERRUPT):
Start with ONE of these:
- "STOP. Your [THING] is losing you [RESULT] right now."
- "Delete this from your [PLATFORM] immediately."
- "Nobody is telling you this about [TOPIC]."
Say this while doing something visually unexpected (point at camera, hold up paper, dramatic zoom).

SECOND 2-10 (THE PROBLEM):
"Every day, [TARGET AUDIENCE] makes this mistake: [COMMON MISTAKE]. And it's costing them [SPECIFIC CONSEQUENCE]."

SECOND 10-25 (THE FIX):
"Here's what to do instead:"
- Step 1: [Action] — show on screen
- Step 2: [Action] — show on screen
- Step 3: [Action] — show on screen
Keep each step under 5 seconds.

SECOND 25-30 (HOOK TO FOLLOW):
"Save this for later. Follow for more [NICHE] tips that actually work."

Rules:
- First 1 second must be jarring/unexpected
- Speak fast but clearly
- Use captions (80% watch without sound)
- No filler words ("um", "so", "like")
- Show, don't just tell`,
        instructions: `1. Choose your niche topic and target audience
2. Film the first 2 seconds FIRST — this is what stops the scroll
3. Use big text overlays for each step
4. Add trending audio underneath (lower volume)
5. Post between 11 AM - 1 PM or 7 PM - 9 PM
6. Use 3-5 relevant hashtags, not 30
7. Reply to every comment within 1 hour of posting`,
        tutorialLink: '',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'The "Unpopular Opinion" Framework',
        category: 'Authority Post',
        platform: 'LinkedIn',
        promptType: 'text',
        problem: 'Safe takes blend into the feed noise, zero comments.',
        before: '"I think it\'s important to have a good work-life balance. Here are my thoughts..."',
        after: '"Unpopular opinion: Work-life balance is a myth sold by people who\'ve never built anything. Here\'s what I do instead (and why I\'ve never been happier)..."',
        price: 3,
        impressions: 21000,
        likes: 1400,
        fullPrompt: `Write a LinkedIn post using the "Unpopular Opinion" framework. This format generates 3-5x more comments than standard posts because it polarizes the audience.

FORMULA:

LINE 1 (THE TRIGGER):
"Unpopular opinion: [BOLD STATEMENT that challenges the status quo]."
This must be genuinely controversial but defensible. Not offensive — just different.

LINES 2-4 (THE CONTEXT):
"I used to believe [COMMON BELIEF] too. Then [SPECIFIC EVENT] happened and everything changed."

LINES 5-10 (YOUR ARGUMENT):
Present 3 reasons why your unpopular opinion is actually correct:
1. [Reason with evidence]
2. [Reason with personal experience]
3. [Reason with data/example]

LINE 11 (THE FLIP):
"The truth is: [REFRAME the original statement in a nuanced way]."

LINE 12 (CTA):
"Agree or disagree? Drop your take below. 👇"

Rules:
- The opinion must be genuinely held, not clickbait
- Back it up with real experience
- Acknowledge the other side briefly
- Keep paragraphs to 1-2 lines max
- No emojis in the first 3 lines
- End with a polarizing question`,
        instructions: `1. Pick a belief in your industry that most people agree with
2. Think about why you disagree (or have a different angle)
3. Write from personal experience — generic takes don't work
4. Expect pushback in comments — engage with EVERY comment
5. The more comments (even disagreements), the more reach
6. Post at 8:30 AM on Tuesday or Wednesday`,
        tutorialLink: '',
        beforeImage: '',
        afterImage: '',
    },
    {
        title: 'The "Free Resource" Bait',
        category: 'Lead Magnet',
        platform: 'X (Twitter)',
        promptType: 'text',
        problem: 'Nobody clicks your link when you just say "check out my tool".',
        before: '"Hey everyone! Check out my new tool for content creators! Link in bio 🔗"',
        after: '"I spent 40 hours building a free Notion template that plans 30 days of LinkedIn content in 10 minutes. Reply \'CONTENT\' and I\'ll DM it to you."',
        price: 3,
        impressions: 28000,
        likes: 3400,
        fullPrompt: `Write a lead magnet post using the "Free Resource Bait" framework. This format generates massive engagement because it uses the reply-to-get mechanic.

FORMULA:

LINE 1 (EFFORT SIGNAL):
"I spent [TIME INVESTED] building a free [RESOURCE TYPE] that [SPECIFIC OUTCOME] in [SHORT TIMEFRAME]."
The time invested signals value. The outcome signals benefit.

LINE 2-3 (WHAT'S INSIDE):
"Inside you'll find:"
- ✅ [Benefit 1]
- ✅ [Benefit 2]
- ✅ [Benefit 3]
- ✅ [Benefit 4]

LINE 4 (SOCIAL PROOF — optional):
"[NUMBER] people have already grabbed it."

LINE 5 (CTA):
"Reply '[KEYWORD]' and I'll DM it to you."

The keyword creates a low-friction action. Replies boost engagement signals massively.

Rules:
- The resource must actually exist and be genuinely useful
- Use a short, memorable keyword (CONTENT, GROWTH, LAUNCH)
- Actually DM people who reply (use automation tools)
- Don't put the link in the original post — DM only
- The resource should collect their email for your list`,
        instructions: `1. Create a genuinely valuable free resource (Notion template, PDF checklist, spreadsheet, etc.)
2. Set up an email capture page (Gumroad $0 works great)
3. Post this tweet during peak hours (9-11 AM EST, Tue-Thu)
4. Use a tool like TweetHunter or Typefully to auto-DM the link
5. Follow up with everyone who replied but didn't click the link
6. Repost every 2-3 weeks — this format stays evergreen`,
        tutorialLink: '',
        beforeImage: '',
        afterImage: '',
    },
];

async function seed() {
    console.log('🌱 Seeding prompts to Firestore...\n');

    for (const prompt of prompts) {
        try {
            const docRef = await db.collection('prompts').add({
                ...prompt,
                createdAt: FieldValue.serverTimestamp(),
            });
            console.log(`✅ Added: "${prompt.title}" (${docRef.id})`);
        } catch (err) {
            console.error(`❌ Failed: "${prompt.title}"`, err);
        }
    }

    console.log('\n🎉 Done! All prompts seeded.');
    process.exit(0);
}

seed();
