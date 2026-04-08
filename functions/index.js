  const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Busboy = require("busboy");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { validateEvent, WebhookVerificationError } = require("@polar-sh/sdk/webhooks");

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Secret key — must match the one in your iOS Shortcut
const API_SECRET = "988e1f963ecf93e9c2d48f087cdc236d862e6cfbf40104f5e73d4acd75e4e966";

// Admin email for server-side checks
const ADMIN_EMAIL = "shaheelsaha55@gmail.com";

// Free tier unlock limit
const FREE_UNLOCK_LIMIT = 5;

/**
 * publishPrompt — receives an image + metadata from iOS Shortcut
 * POST multipart/form-data with fields:
 *   secret  — auth secret
 *   title   — prompt title
 *   prompt  — the actual prompt text
 *   platform — Midjourney | DALL-E | Sora | Veo | Nano banana | Runway
 *   category — (optional) category string
 *   image   — the image file
 */
exports.publishPrompt = onRequest(
  { cors: true, maxInstances: 5, region: "us-central1" },
  (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const busboy = Busboy({ headers: req.headers });

    const fields = {};
    let fileBuffer = null;
    let fileMime = "";
    let fileName = "";

    busboy.on("field", (name, val) => {
      fields[name] = val;
    });

    busboy.on("file", (name, file, info) => {
      const { filename, mimeType } = info;
      fileMime = mimeType;
      fileName = filename || `upload_${Date.now()}`;
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("finish", async () => {
      try {
        // 1. Verify secret
        if (fields.secret !== API_SECRET) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        // 2. Validate required fields
        const title = fields.title;
        const prompt = fields.prompt || "";
        const description = fields.description || "";
        const platform = fields.platform || "Midjourney";
        const category = fields.category || "Product & E-commerce";

        if (!title) {
          return res.status(400).json({ error: "Title is required" });
        }

        // 3. Upload image to Firebase Storage
        let imageUrl = "";
        if (fileBuffer) {
          const ext = path.extname(fileName) || ".jpg";
          const storagePath = `prompt-images/${Date.now()}_${uuidv4()}${ext}`;
          const fileRef = bucket.file(storagePath);
          const token = uuidv4();

          await fileRef.save(fileBuffer, {
            metadata: {
              contentType: fileMime || "image/jpeg",
              metadata: { firebaseStorageDownloadTokens: token },
            },
          });

          const bucketName = bucket.name;
          imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
        }

        // 4. Create slug from title
        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // 5. Write to Firestore (fullPrompt goes to private subcollection)
        const docRef = await db.collection("prompts").add({
          title,
          problem: description || title,
          platform,
          category,
          slug,
          promptType: "image",
          afterImage: imageUrl,
          outputMedia: imageUrl,
          outputMediaType: "image",
          beforeImage: "",
          tutorialVideo: "",
          impressions: 0,
          likes: 0,
          isPremium: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Write prompt text to private subcollection
        if (prompt) {
          await docRef.collection("private").doc("content").set({
            fullPrompt: prompt,
          });
        }

        return res.status(200).json({
          success: true,
          id: docRef.id,
          slug,
          imageUrl,
          message: `Prompt "${title}" published successfully!`,
        });
      } catch (err) {
        console.error("publishPrompt error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    busboy.end(req.rawBody);
  }
);

// ═══════════════════════════════════════════════════════════
//  addPromptFromShortcut — handles CREATE + UPDATE_VIDEO
//  POST multipart/form-data with fields:
//    secret       — auth secret (required)
//    action       — "create" | "update_video" (required)
//    title        — prompt title (required for create)
//    prompt       — the actual prompt text (create)
//    description  — short description (create)
//    platform     — Midjourney | DALL-E | Sora | etc (create)
//    category     — category string (create)
//    promptId     — Firestore doc ID (required for update_video)
//    media        — image or video file (optional for create, required for update_video)
// ═══════════════════════════════════════════════════════════
exports.addPromptFromShortcut = onRequest(
  { cors: true, maxInstances: 5, region: "us-central1" },
  (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const busboy = Busboy({ headers: req.headers });

    const fields = {};
    // Support multiple file fields: "media" (preview image) + "tutorialVideo" (optional)
    const files = {};

    busboy.on("field", (name, val) => {
      fields[name] = val;
    });

    busboy.on("file", (fieldName, file, info) => {
      const { filename, mimeType } = info;
      console.log(`[Busboy] Received file for field: "${fieldName}", filename: "${filename}", mimeType: "${mimeType}"`);
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        files[fieldName] = {
          buffer: Buffer.concat(chunks),
          mime: mimeType,
          name: filename || `upload_${Date.now()}`,
        };
        console.log(`[Busboy] Finished reading field: "${fieldName}" (${files[fieldName].buffer.length} bytes)`);
      });
    });

    busboy.on("finish", async () => {
      try {
        console.log("[Busboy] Finished parsing request");
        // 1. Verify secret
        if (fields.secret !== API_SECRET) {
          console.error("[Auth] Unauthorized request");
          return res.status(401).json({ error: "Unauthorized" });
        }

        const action = (fields.action || "create").toLowerCase();
        console.log(`[Action] Processing action: "${action}"`);

        // ── Helper: upload a specific file to Storage ──
        const uploadFile = async (fileObj, fieldNameLog) => {
          if (!fileObj) {
            console.log(`[Upload - ${fieldNameLog}] No file provided, skipping.`);
            return { url: "", type: "" };
          }

          console.log(`[Upload - ${fieldNameLog}] Processing file: ${fileObj.name} (MIME: ${fileObj.mime})`);
          
          // CRITICAL: Apple Shortcuts sometimes sends video as application/octet-stream
          // We need to check the extension string too just in case.
          const isVideo = fileObj.mime.startsWith("video/") || fileObj.name.toLowerCase().endsWith(".mp4") || fileObj.name.toLowerCase().endsWith(".mov");
          
          const ext = path.extname(fileObj.name) || (isVideo ? ".mp4" : ".jpg");
          const folder = isVideo ? "prompt-videos" : "prompt-images";
          const storagePath = `${folder}/${Date.now()}_${uuidv4()}${ext}`;
          
          console.log(`[Upload - ${fieldNameLog}] Saving to folder: ${folder}, Path: ${storagePath}`);
          
          const fileRef = bucket.file(storagePath);
          const token = uuidv4();

          await fileRef.save(fileObj.buffer, {
            metadata: {
              contentType: fileObj.mime || (isVideo ? "video/mp4" : "image/jpeg"),
              metadata: { firebaseStorageDownloadTokens: token },
            },
          });

          const bucketName = bucket.name;
          const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
          console.log(`[Upload - ${fieldNameLog}] Success! URL: ${url}`);
          return { url, type: isVideo ? "video" : "image" };
        };

        // ════════════════════════════════════
        //  ACTION: CREATE
        // ════════════════════════════════════
        if (action === "create") {
          const title = fields.title;
          if (!title) {
            console.error("[Action - create] Missing title");
            return res.status(400).json({ error: "Title is required" });
          }

          const promptText = fields.prompt || "";
          const description = fields.description || title;
          
          // ── Fuzzy Matching for Platform and Category ──
          const PLATFORMS = [
            "Midjourney", "Stable Diffusion", "Grok", "Sora",
            "Runway", "Nano banana", "ChatGPT", "Other"
          ];
          
          const CATEGORIES = [
            "Product & E-commerce", "Real Estate & Interior", "Fashion & Beauty",
            "Food & Restaurant", "Sports & Fitness", "Travel & Nature",
            "Portrait & Headshot", "Automotive", "Animation & Cartoon",
            "Logo & Branding", "Social Media Content", "Film & Cinematic",
            "Music & Entertainment", "Education & Explainer", "Gaming & Sci-Fi", "Other"
          ];

          const fuzzyMatch = (input, validList, defaultVal) => {
            if (!input) return defaultVal;
            const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
            const normalizedInput = normalize(input);
            for (const item of validList) {
              if (normalize(item) === normalizedInput || normalize(item).includes(normalizedInput) || normalizedInput.includes(normalize(item))) {
                return item;
              }
            }
            return input; // Fallback to whatever they typed if no fuzzy match
          };

          const platform = fuzzyMatch(fields.platform, PLATFORMS, "Midjourney");
          const category = fuzzyMatch(fields.category, CATEGORIES, "Product & E-commerce");

          // Support multi-platform: "Midjourney, Grok" → ["Midjourney", "Grok"]
          const rawPlatforms = (fields.platform || "Midjourney").split(",").map(s => s.trim()).filter(Boolean);
          const platformArray = rawPlatforms.map(p => fuzzyMatch(p, PLATFORMS, p));
          // Store as array (even if single) for consistency
          const platformField = platformArray.length === 1 ? platformArray[0] : platformArray;

          // Upload preview image (from "media" field)
          const media = await uploadFile(files.media, "media");

          // Upload tutorial video — Apple Shortcuts may send as "tutorialVideo" or "tutorialvideo"
          const tutorial = await uploadFile(files.tutorialVideo || files.tutorialvideo, "tutorialVideo");

          // ── Download & upload public image URLs (1-4) ──
          const images = [];
          if (fields.imageUrls) {
            let urlList = [];
            try {
              urlList = JSON.parse(fields.imageUrls);
            } catch (e) {
              console.warn("[Action - create] Failed to parse imageUrls JSON, trying comma-split");
              urlList = fields.imageUrls.split(",").map(u => u.trim()).filter(Boolean);
            }

            // Cap at 4 images
            const urls = urlList.slice(0, 4);
            console.log(`[Action - create] Processing ${urls.length} image URL(s)`);

            for (let i = 0; i < urls.length; i++) {
              try {
                const imgUrl = urls[i];
                console.log(`[Action - create] Downloading image ${i + 1}: ${imgUrl}`);
                const imgRes = await fetch(imgUrl);
                if (!imgRes.ok) {
                  console.error(`[Action - create] Failed to fetch image ${i + 1}: HTTP ${imgRes.status}`);
                  continue;
                }
                const arrayBuffer = await imgRes.arrayBuffer();
                const imgBuffer = Buffer.from(arrayBuffer);
                const contentType = imgRes.headers.get("content-type") || "image/jpeg";

                // Determine extension from content-type or URL
                let ext = ".jpg";
                if (contentType.includes("png")) ext = ".png";
                else if (contentType.includes("webp")) ext = ".webp";
                else if (contentType.includes("gif")) ext = ".gif";
                else {
                  const urlExt = imgUrl.split("?")[0].split(".").pop()?.toLowerCase();
                  if (["jpg","jpeg","png","webp","gif"].includes(urlExt)) ext = `.${urlExt}`;
                }

                const storagePath = `prompt-images/${Date.now()}_${uuidv4()}${ext}`;
                const fileRef = bucket.file(storagePath);
                const token = uuidv4();

                await fileRef.save(imgBuffer, {
                  metadata: {
                    contentType,
                    metadata: { firebaseStorageDownloadTokens: token },
                  },
                });

                const bucketName = bucket.name;
                const cdnUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
                images.push(cdnUrl);
                console.log(`[Action - create] Image ${i + 1} uploaded: ${cdnUrl}`);
              } catch (imgErr) {
                console.error(`[Action - create] Error processing image ${i + 1}:`, imgErr.message);
              }
            }
          }

          // Create slug
          const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

          // Determine primary image: first from imageUrls, or from uploaded media file
          const primaryImage = images.length > 0 ? images[0] : (media.type === "image" ? media.url : "");
          const primaryMedia = images.length > 0 ? images[0] : media.url;

          // Write to Firestore (fullPrompt goes to private subcollection)
          const docData = {
            title,
            problem: description,
            platform: platformField,
            category,
            slug,
            promptType: media.type || "image",
            afterImage: primaryImage,
            outputMedia: primaryMedia,
            outputMediaType: media.type || "image",
            outputMediaUrl: primaryMedia,
            beforeImage: "",
            tutorialVideo: tutorial.url || "",
            images: images.length > 0 ? images : (media.url ? [media.url] : []),
            impressions: 0,
            likes: 0,
            isPremium: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          const docRef = await db.collection("prompts").add(docData);

          // Write prompt text to private subcollection
          if (promptText) {
            await docRef.collection("private").doc("content").set({
              fullPrompt: promptText,
            });
          }
          console.log(`[Action - create] Success! Created prompt ${docRef.id}`);

          return res.status(200).json({
            success: true,
            id: docRef.id,
            slug,
            mediaUrl: media.url,
            message: `Prompt "${title}" created successfully!`,
          });
        }

        // ════════════════════════════════════
        //  ACTION: UPDATE_VIDEO
        // ════════════════════════════════════
        if (action === "update_video") {
          let promptId = fields.promptId;
          const promptTitle = fields.promptTitle;

          // Allow lookup by title if no ID provided
          if (!promptId && promptTitle) {
            const titleQuery = await db
              .collection("prompts")
              .where("title", "==", promptTitle)
              .limit(1)
              .get();
            if (titleQuery.empty) {
              console.error(`[Action - update_video] Title not found: "${promptTitle}"`);
              return res.status(404).json({ error: `No prompt found with title "${promptTitle}"` });
            }
            promptId = titleQuery.docs[0].id;
          }

          if (!promptId) {
            console.error("[Action - update_video] Missing ID or Title");
            return res.status(400).json({ error: "promptId or promptTitle is required for update_video" });
          }

          // Accept file from either "media" or "tutorialVideo" field name
          const fileObj = files.media || files.tutorialVideo;
          if (!fileObj) {
            console.error("[Action - update_video] No file provided in request");
            return res.status(400).json({ error: "A video/image file is required for update_video" });
          }

          // Upload the media file
          const media = await uploadFile(fileObj, "update_video_media");



          // Update Firestore document
          const docRef = db.collection("prompts").doc(promptId);
          const snap = await docRef.get();
          if (!snap.exists) {
            return res.status(404).json({ error: `Prompt with ID "${promptId}" not found` });
          }

          const updateData = {
            outputMedia: media.url,
            outputMediaUrl: media.url,
            outputMediaType: media.type,
          };
          // If it's a video, also set the tutorialVideo field
          if (media.type === "video") {
            updateData.tutorialVideo = media.url;
          } else {
            updateData.afterImage = media.url;
          }

          await docRef.update(updateData);

          return res.status(200).json({
            success: true,
            id: promptId,
            mediaUrl: media.url,
            message: `Prompt "${snap.data().title}" updated with ${media.type}!`,
          });
        }

        return res.status(400).json({ error: `Unknown action: "${action}". Use "create" or "update_video".` });

      } catch (err) {
        console.error("addPromptFromShortcut error:", err);
        return res.status(500).json({ error: "Internal server error", details: err.message });
      }
    });

    busboy.end(req.rawBody);
  }
);


// ═══════════════════════════════════════════════════════════
//  getRecentPrompts — returns recent prompts for Apple Shortcut menu
//  GET with header: Authorization: Bearer <API_SECRET>
// ═══════════════════════════════════════════════════════════
exports.getRecentPrompts = onRequest(
  { cors: true, maxInstances: 2, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Verify secret (via header or query param)
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const querySecret = req.query.secret || "";

    if (token !== API_SECRET && querySecret !== API_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const snapshot = await db
        .collection("prompts")
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      // Return a simple array of title strings — Apple Shortcuts
      // can display these directly in "Choose from List"
      const titles = snapshot.docs.map(
        (doc) => doc.data().title || "Untitled"
      );

      return res.status(200).json(titles);
    } catch (err) {
      console.error("getRecentPrompts error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// ═══════════════════════════════════════════════════════════
//  createPolarCheckout — server-side checkout session creation
//  Ensures firebase_uid metadata is properly embedded
// ═══════════════════════════════════════════════════════════
exports.createPolarCheckout = onRequest(
  { cors: true, maxInstances: 10, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { firebase_uid, email, price_id, success_url } = req.body;

      if (!firebase_uid || !price_id) {
        return res.status(400).json({ error: "Missing firebase_uid or price_id" });
      }

      const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN || "";
      if (!POLAR_ACCESS_TOKEN) {
        console.error("[createPolarCheckout] POLAR_ACCESS_TOKEN is not set!");
        return res.status(500).json({ error: "Server configuration error" });
      }

      // Use sandbox API for now
      const polarApiBase = "https://sandbox-api.polar.sh";

      const checkoutPayload = {
        product_id: price_id, // User provided Product IDs, which Polar API accepts directly
        metadata: {
          firebase_uid: firebase_uid,
        },
        // Allow dynamic success_url for local testing, fallback to production
        success_url: success_url || "https://promptfactory.cc/dashboard?upgraded=true",
      };

      if (email) {
        checkoutPayload.customer_email = email;
      }

      console.log("[createPolarCheckout] Creating checkout for user:", firebase_uid);

      const response = await fetch(`${polarApiBase}/v1/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${POLAR_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[createPolarCheckout] Polar API error:", data);
        return res.status(response.status).json({ error: data.detail || "Polar API error", raw: data });
      }

      console.log("[createPolarCheckout] Checkout created:", data.url);
      return res.status(200).json({ checkout_url: data.url });
    } catch (err) {
      console.error("[createPolarCheckout] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// ═══════════════════════════════════════════════════════════
//  createCreditCheckout — one-time purchase checkout for credit packs
//  Maps credit_pack to Polar Product ID, embeds metadata
// ═══════════════════════════════════════════════════════════
const CREDIT_PACK_MAP = {
  "1_credit": { productId: process.env.POLAR_1_CREDIT_PRODUCT_ID || "", amount: 1 },
  "5_credits": { productId: process.env.POLAR_5_CREDITS_PRODUCT_ID || "", amount: 5 },
  "15_credits": { productId: process.env.POLAR_15_CREDITS_PRODUCT_ID || "", amount: 15 },
};

exports.createCreditCheckout = onRequest(
  { cors: true, maxInstances: 10, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { firebase_uid, email, credit_pack, success_url } = req.body;

      if (!firebase_uid || !credit_pack) {
        return res.status(400).json({ error: "Missing firebase_uid or credit_pack" });
      }

      const packInfo = CREDIT_PACK_MAP[credit_pack];
      if (!packInfo || !packInfo.productId) {
        return res.status(400).json({ error: `Invalid credit_pack: ${credit_pack}` });
      }

      const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN || "";
      if (!POLAR_ACCESS_TOKEN) {
        console.error("[createCreditCheckout] POLAR_ACCESS_TOKEN is not set!");
        return res.status(500).json({ error: "Server configuration error" });
      }

      const polarApiBase = "https://sandbox-api.polar.sh";

      const checkoutPayload = {
        product_id: packInfo.productId,
        metadata: {
          firebase_uid: firebase_uid,
          credit_pack: credit_pack,
        },
        success_url: success_url || "https://promptfactory.cc/dashboard?credits_added=true",
      };

      if (email) {
        checkoutPayload.customer_email = email;
      }

      console.log(`[createCreditCheckout] Creating checkout for user: ${firebase_uid}, pack: ${credit_pack}`);

      const response = await fetch(`${polarApiBase}/v1/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${POLAR_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[createCreditCheckout] Polar API error:", data);
        return res.status(response.status).json({ error: data.detail || "Polar API error", raw: data });
      }

      console.log("[createCreditCheckout] Checkout created:", data.url);
      return res.status(200).json({ checkout_url: data.url });
    } catch (err) {
      console.error("[createCreditCheckout] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);



// ═══════════════════════════════════════════════════════════
//  polarWebhook — handles Polar.sh subscription events
//  Uses @polar-sh/sdk validateEvent for reliable verification
// ═══════════════════════════════════════════════════════════
exports.polarWebhook = onRequest(
  { cors: false, maxInstances: 3, region: "us-central1", invoker: "public" },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET || "";

      console.log("[Polar Webhook] Incoming request");
      console.log("[Polar Webhook] Secret length:", POLAR_WEBHOOK_SECRET.length);
      console.log("[Polar Webhook] Has rawBody:", !!req.rawBody);
      console.log("[Polar Webhook] webhook-id:", req.headers["webhook-id"] || "MISSING");

      if (!POLAR_WEBHOOK_SECRET) {
        console.error("[Polar Webhook] POLAR_WEBHOOK_SECRET is not set!");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      // Use the Polar SDK's own validateEvent for correct verification
      const payload = req.rawBody; // Pass the raw Buffer directly
      const headers = req.headers;  // Pass all headers

      let parsed;
      try {
        parsed = validateEvent(payload, headers, POLAR_WEBHOOK_SECRET);
      } catch (verifyErr) {
        console.error("[Polar Webhook] Verification failed:", verifyErr.message);

        const payloadStr = req.rawBody.toString("utf8");
        await db.collection("webhook_logs").add({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          error: verifyErr.message,
          secretLength: POLAR_WEBHOOK_SECRET.length,
          hasRawBody: !!req.rawBody,
          webhookId: req.headers["webhook-id"] || "MISSING",
          webhookTimestamp: req.headers["webhook-timestamp"] || "MISSING",
          webhookSignature: req.headers["webhook-signature"] || "MISSING",
          payloadSnippet: payloadStr.substring(0, 200),
        });

        if (verifyErr instanceof WebhookVerificationError) {
          return res.status(403).json({ error: "Invalid webhook signature" });
        }
        return res.status(500).json({ error: "Webhook verification error" });
      }

      const eventType = parsed.type;
      console.log(`[Polar Webhook] ✅ Verified event: ${eventType}`);

      // Extract Firebase UID from metadata
      const firebaseUid = parsed.data?.metadata?.firebase_uid;
      if (!firebaseUid) {
        console.warn("[Polar Webhook] No firebase_uid in metadata. Ignored (likely a test event).");
        return res.status(200).json({ received: true, warning: "Missing firebase_uid" });
      }

      const userRef = db.collection("users").doc(firebaseUid);

      if (eventType === "subscription.created" || eventType === "subscription.updated" || eventType === "subscription.active" || eventType === "subscription.canceled") {
        const subscription = parsed.data;

        // Log the full subscription object so we can see exact field names from Polar
        console.log("[Polar Webhook] Full subscription data keys:", Object.keys(subscription));
        console.log("[Polar Webhook] Subscription data:", JSON.stringify(subscription).substring(0, 500));

        const isYearly = (subscription.recurring_interval || subscription.recurringInterval) === "year";
        const tier = isYearly ? "pro_yearly" : "pro_monthly";

        // Polar may nest customer_id differently across API versions
        const customerId = subscription.customer_id 
          || subscription.customerId 
          || subscription.customer?.id 
          || null;

        const subscriptionData = {
          tier,
          subscription: {
            polarSubscriptionId: subscription.id || null,
            polarCustomerId: customerId,
            plan: tier,
            status: subscription.status || "active",
            currentPeriodEnd: subscription.current_period_end || subscription.currentPeriodEnd || null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancelAtPeriodEnd || false,
          },
        };

        // Remove any null values to avoid Firestore issues
        Object.keys(subscriptionData.subscription).forEach(key => {
          if (subscriptionData.subscription[key] === undefined) {
            subscriptionData.subscription[key] = null;
          }
        });

        await userRef.set(subscriptionData, { merge: true });

        console.log(`[Polar Webhook] User ${firebaseUid} updated to ${tier} (Event: ${eventType})`);
      }

      if (eventType === "subscription.revoked") {
        await userRef.set({
          tier: "free",
          subscription: {
            status: "revoked",
            cancelAtPeriodEnd: true,
          },
        }, { merge: true });

        console.log(`[Polar Webhook] User ${firebaseUid} downgraded to free (Revoked)`);
      }

      // ── Handle All Transactions (Subscriptions & Credit Packs) ──
      if (eventType === "order.created") {
        const order = parsed.data;
        const creditPack = order.metadata?.credit_pack;

        // Automatically log all payments (subscription charges and credit pack buys)
        await userRef.collection("transactions").add({
            amount: order.amount || 0,
            currency: order.currency || "usd",
            description: order.product?.name || (creditPack ? `Purchased Credits (Pack: ${creditPack})` : "Subscription Payment"),
            type: creditPack ? "credit_pack" : "subscription",
            pack: creditPack || null,
            orderId: order.id || null,
            polarProductId: order.product_id || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // If it was a credit pack, actually increment their balance
        if (creditPack && CREDIT_PACK_MAP[creditPack]) {
          const creditAmount = CREDIT_PACK_MAP[creditPack].amount;

          // Increment the user's credits
          await userRef.set({
            credits: admin.firestore.FieldValue.increment(creditAmount),
          }, { merge: true });

          console.log(`[Polar Webhook] User ${firebaseUid} received ${creditAmount} credits (pack: ${creditPack})`);
        } else {
          console.log(`[Polar Webhook] order.created recorded a subscription payment.`);
        }
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error("[Polar Webhook] Unhandled error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════
//  getTrustStats — returns aggregated stats for the home page
//  Safely counts users and prompts without exposing data or rules
// ═══════════════════════════════════════════════════════════
exports.getTrustStats = onRequest(
  { cors: true, maxInstances: 5, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      // 1. Total Users
      const usersSnap = await db.collection("users").count().get();
      const totalUsers = usersSnap.data().count;

      // 2. Total Prompts
      const promptsSnap = await db.collection("prompts").count().get();
      const totalPrompts = promptsSnap.data().count;

      // 3. Recent Prompts (Last 7 Days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSnap = await db.collection("prompts")
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .count()
        .get();
      const recentPrompts = recentSnap.data().count;

      // 4. Total Views (Sum of impressions)
      // Using AggregateField requires admin sdk version that supports it (v11+). 
      // If it fails, fallback to iterating (which is fast when < 1000 prompts)
      let totalViews = 0;
      try {
        const viewsSnap = await db.collection("prompts")
          .aggregate({ totalViews: admin.firestore.AggregateField.sum("impressions") })
          .get();
        totalViews = viewsSnap.data().totalViews || 0;
      } catch (aggErr) {
        console.warn("Aggregate sum failed, falling back to manual count");
        const allPrompts = await db.collection("prompts").select("impressions").get();
        allPrompts.forEach(doc => {
           totalViews += doc.data().impressions || 0;
        });
      }

      return res.status(200).json({
        totalUsers,
        totalPrompts,
        recentPrompts,
        totalViews
      });
    } catch (err) {
      console.error("getTrustStats error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════
//  getPromptContent — securely returns prompt text
//  Only returns fullPrompt if user has unlocked or has pro
// ═══════════════════════════════════════════════════════════
exports.getPromptContent = onRequest(
  { cors: true, maxInstances: 10, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { promptId, idToken } = req.body;

      if (!promptId || !idToken) {
        return res.status(400).json({ error: "Missing promptId or idToken" });
      }

      // Verify the Firebase ID token
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (authErr) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const uid = decodedToken.uid;

      // Check if user has access (pro tier OR has unlocked this prompt)
      const userSnap = await db.collection("users").doc(uid).get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const tier = userData.tier || "free";
      const hasFullAccess = tier === "pro_monthly" || tier === "pro_yearly";

      if (!hasFullAccess) {
        // Check if they've unlocked this specific prompt
        const unlockSnap = await db.collection("users").doc(uid).collection("unlocked").doc(promptId).get();
        if (!unlockSnap.exists) {
          return res.status(403).json({ error: "Prompt not unlocked" });
        }
      }

      // Fetch the private content
      const contentSnap = await db.collection("prompts").doc(promptId).collection("private").doc("content").get();
      if (!contentSnap.exists) {
        return res.status(404).json({ error: "Prompt content not found" });
      }

      return res.status(200).json({
        fullPrompt: contentSnap.data().fullPrompt || "",
      });
    } catch (err) {
      console.error("getPromptContent error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// ═══════════════════════════════════════════════════════════
//  unlockPrompt — server-side unlock validation
//  Verifies tier + unlock count, creates record, returns content
// ═══════════════════════════════════════════════════════════
exports.unlockPrompt = onRequest(
  { cors: true, maxInstances: 10, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { promptId, idToken } = req.body;

      if (!promptId || !idToken) {
        return res.status(400).json({ error: "Missing promptId or idToken" });
      }

      // Verify token
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (authErr) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const uid = decodedToken.uid;
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const tier = userData.tier || "free";
      const hasFullAccess = tier === "pro_monthly" || tier === "pro_yearly";

      // Check if already unlocked
      const unlockRef = userRef.collection("unlocked").doc(promptId);
      const unlockSnap = await unlockRef.get();

      if (unlockSnap.exists) {
        // Already unlocked — just return the content
        const contentSnap = await db.collection("prompts").doc(promptId).collection("private").doc("content").get();
        return res.status(200).json({
          alreadyUnlocked: true,
          fullPrompt: contentSnap.exists ? contentSnap.data().fullPrompt : "",
        });
      }

      // Pro subscribers: return content WITHOUT writing a permanent unlock receipt.
      // This means when their subscription ends, they lose access.
      if (hasFullAccess) {
        const contentSnap = await db.collection("prompts").doc(promptId).collection("private").doc("content").get();
        return res.status(200).json({
          success: true,
          accessMethod: "subscription",
          fullPrompt: contentSnap.exists ? contentSnap.data().fullPrompt : "",
        });
      }

      // Free tier cap check — try free unlocks first, then paid credits
      let unlockMethod = hasFullAccess ? "full_access" : "free_unlock";

      if (!hasFullAccess) {
        const allUnlocks = await userRef.collection("unlocked").count().get();
        const unlockCount = allUnlocks.data().count;

        if (unlockCount >= FREE_UNLOCK_LIMIT) {
          // Free unlocks exhausted — check for paid credits
          const userCredits = userData.credits || 0;

          if (userCredits > 0) {
            // Deduct 1 credit
            await userRef.update({
              credits: admin.firestore.FieldValue.increment(-1),
            });

            // Log the credit spend
            await userRef.collection("credit_transactions").add({
              type: "spend",
              amount: -1,
              promptId: promptId,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });

            unlockMethod = "credit";
          } else {
            return res.status(403).json({
              error: "No unlocks remaining",
              unlockCount,
              limit: FREE_UNLOCK_LIMIT,
              credits: 0,
            });
          }
        }
      }

      // Create unlock record
      await unlockRef.set({
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        method: unlockMethod,
      });

      // Increment unlock count on the prompt
      const promptRef = db.collection("prompts").doc(promptId);
      await promptRef.update({
        unlocks: admin.firestore.FieldValue.increment(1),
      });

      // Return the content
      const contentSnap = await db.collection("prompts").doc(promptId).collection("private").doc("content").get();

      return res.status(200).json({
        success: true,
        fullPrompt: contentSnap.exists ? contentSnap.data().fullPrompt : "",
      });
    } catch (err) {
      console.error("unlockPrompt error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// ═══════════════════════════════════════════════════════════
//  trackView — server-side view/impression counter
//  Prevents client-side inflation
// ═══════════════════════════════════════════════════════════
exports.trackView = onRequest(
  { cors: true, maxInstances: 10, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { promptId } = req.body;

      if (!promptId) {
        return res.status(400).json({ error: "Missing promptId" });
      }

      // Verify prompt exists
      const promptRef = db.collection("prompts").doc(promptId);
      const promptSnap = await promptRef.get();
      if (!promptSnap.exists) {
        return res.status(404).json({ error: "Prompt not found" });
      }

      // Increment view count
      await promptRef.update({
        impressions: admin.firestore.FieldValue.increment(1),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("trackView error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// ═══════════════════════════════════════════════════════════
//  adminWritePrompt — admin-only prompt CRUD
//  Used by AdminPage for creating/updating/deleting prompts
// ═══════════════════════════════════════════════════════════
exports.adminWritePrompt = onRequest(
  { cors: true, maxInstances: 5, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { idToken, action, promptId, data } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: "Missing idToken" });
      }

      // Verify admin
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (authErr) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (decodedToken.email !== ADMIN_EMAIL) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // CREATE
      if (action === "create") {
        const { fullPrompt, ...publicData } = data;

        const docRef = await db.collection("prompts").add({
          ...publicData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Write prompt text to private subcollection
        if (fullPrompt) {
          await docRef.collection("private").doc("content").set({ fullPrompt });
        }

        return res.status(200).json({ success: true, id: docRef.id });
      }

      // UPDATE
      if (action === "update") {
        if (!promptId) {
          return res.status(400).json({ error: "Missing promptId for update" });
        }

        const { fullPrompt, ...publicData } = data;

        await db.collection("prompts").doc(promptId).update(publicData);

        // Update private content if provided
        if (fullPrompt !== undefined) {
          await db.collection("prompts").doc(promptId)
            .collection("private").doc("content")
            .set({ fullPrompt }, { merge: true });
        }

        return res.status(200).json({ success: true });
      }

      // DELETE
      if (action === "delete") {
        if (!promptId) {
          return res.status(400).json({ error: "Missing promptId for delete" });
        }

        // Delete private subcollection first
        const privDocs = await db.collection("prompts").doc(promptId).collection("private").listDocuments();
        for (const d of privDocs) {
          await d.delete();
        }

        // Delete the main document
        await db.collection("prompts").doc(promptId).delete();

        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (err) {
      console.error("adminWritePrompt error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// ═══════════════════════════════════════════════════════════
//  migratePrompts — ONE-TIME migration endpoint
//  Moves fullPrompt from main docs to private/content subcollection
//  DELETE THIS FUNCTION AFTER RUNNING IT ONCE
// ═══════════════════════════════════════════════════════════
exports.migratePrompts = onRequest(
  { cors: true, maxInstances: 1, region: "us-central1", timeoutSeconds: 300 },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { secret } = req.body;
    if (secret !== API_SECRET) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const snapshot = await db.collection("prompts").get();
      const results = [];
      let migrated = 0;
      let skipped = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const promptId = doc.id;
        const fullPrompt = data.fullPrompt || data.prompt || "";

        if (!fullPrompt) {
          results.push({ id: promptId, title: data.title, status: "skipped_no_content" });
          skipped++;
          continue;
        }

        // Check if already migrated
        const privateRef = db.collection("prompts").doc(promptId).collection("private").doc("content");
        const privateSnap = await privateRef.get();

        if (privateSnap.exists) {
          results.push({ id: promptId, title: data.title, status: "already_migrated" });
          skipped++;
          continue;
        }

        // Write to private subcollection
        await privateRef.set({ fullPrompt });

        // Remove fullPrompt and prompt from main doc
        const updateData = {};
        if (data.fullPrompt !== undefined) updateData.fullPrompt = admin.firestore.FieldValue.delete();
        if (data.prompt !== undefined) updateData.prompt = admin.firestore.FieldValue.delete();

        if (Object.keys(updateData).length > 0) {
          await doc.ref.update(updateData);
        }

        results.push({ id: promptId, title: data.title, status: "migrated" });
        migrated++;
      }

      return res.status(200).json({
        success: true,
        total: snapshot.size,
        migrated,
        skipped,
        results,
      });
    } catch (err) {
      console.error("migratePrompts error:", err);
      return res.status(500).json({ error: "Internal server error", details: err.message });
    }
  }
);


// ═══════════════════════════════════════════════════════════
//  createPolarPortalSession — creates a billing portal URL
//  Uses the Polar SDK for reliable session creation
// ═══════════════════════════════════════════════════════════
exports.createPolarPortalSession = onRequest(
  { cors: true, maxInstances: 5, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { firebase_uid } = req.body;
      if (!firebase_uid) {
        return res.status(400).json({ error: "Missing firebase_uid" });
      }

      const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN || "";
      if (!POLAR_ACCESS_TOKEN) {
        return res.status(500).json({ error: "Server configuration error" });
      }

      const polarApiBase = "https://sandbox-api.polar.sh";

      // Try to get customerId from Firestore
      const userDoc = await db.collection("users").doc(firebase_uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userDoc.data();
      let customerId = userData.subscription?.polarCustomerId;

      // If missing locally, try looking it up by email
      if (!customerId && userData.email) {
        console.log(`[Portal] Looking up customer by email: ${userData.email}`);
        const fetchRes = await fetch(`${polarApiBase}/v1/customers?email=${encodeURIComponent(userData.email)}`, {
            headers: { "Authorization": `Bearer ${POLAR_ACCESS_TOKEN}` }
        });
        if (fetchRes.ok) {
            const data = await fetchRes.json();
            console.log(`[Portal] Customer search result:`, JSON.stringify(data).substring(0, 200));
            if (data.items && data.items.length > 0) {
                customerId = data.items[0].id;
                // Save it back to cache for next time
                await userDoc.ref.set({ subscription: { polarCustomerId: customerId } }, { merge: true });
            }
        }
      }

      if (!customerId) {
        return res.status(404).json({ error: "No billing profile found for this user. Please subscribe first via the Pricing page." });
      }

      console.log(`[Portal] Creating session for customer: ${customerId}`);

      // Create customer session using Polar API
      const createRes = await fetch(`${polarApiBase}/v1/customer-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${POLAR_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          customer_id: customerId,
        }),
      });

      const data = await createRes.json();
      console.log(`[Portal] Session API response status: ${createRes.status}`);
      console.log(`[Portal] Session API response keys:`, Object.keys(data));

      if (!createRes.ok) {
        console.error("[Portal] Polar create session error:", JSON.stringify(data));
        return res.status(createRes.status).json({ error: "Failed to create portal session.", raw: data });
      }

      // The Polar API may return the URL under different field names
      const portalUrl = data.customer_portal_url || data.customerPortalUrl || data.url;
      if (!portalUrl) {
        console.error("[Portal] No portal URL in response. Full response:", JSON.stringify(data));
        return res.status(500).json({ error: "Portal URL not found in Polar response.", keys: Object.keys(data) });
      }

      return res.status(200).json({ url: portalUrl });
    } catch (err) {
      console.error("createPolarPortalSession error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// ═══════════════════════════════════════════════════════════
//  getAdminDashboardStats — admin-only analytics endpoint
//  Returns user counts, subscriber counts, credit stats
// ═══════════════════════════════════════════════════════════
exports.getAdminDashboardStats = onRequest(
  { cors: true, maxInstances: 3, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: "Missing idToken" });
      }

      // Verify admin
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (authErr) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (decodedToken.email !== ADMIN_EMAIL) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // 1. Total Users
      const usersCountSnap = await db.collection("users").count().get();
      const totalUsers = usersCountSnap.data().count;

      // 2. Active Subscribers (pro_monthly or pro_yearly)
      const monthlySnap = await db.collection("users")
        .where("tier", "==", "pro_monthly").count().get();
      const yearlySnap = await db.collection("users")
        .where("tier", "==", "pro_yearly").count().get();
      const activeSubscribers = monthlySnap.data().count + yearlySnap.data().count;

      // 3. Total Prompts
      const promptsSnap = await db.collection("prompts").count().get();
      const totalPrompts = promptsSnap.data().count;

      // 4. Total Unlocks across all users
      let totalUnlocks = 0;
      try {
        const unlocksSnap = await db.collectionGroup("unlocked").count().get();
        totalUnlocks = unlocksSnap.data().count;
      } catch (e) {
        console.warn("collectionGroup unlocked count failed:", e.message);
      }

      // 5. Credits purchased, spent, and revenue
      let creditsBought = 0;
      let creditsSpent = 0;
      let totalRevenueCents = 0;

      try {
        // Try fast collection group queries first
        const txSnap = await db.collectionGroup("transactions")
          .where("type", "==", "credit_pack").get();
        txSnap.forEach(doc => {
          const d = doc.data();
          const pack = d.pack || d.credit_pack;
          if (pack && CREDIT_PACK_MAP[pack]) {
            creditsBought += CREDIT_PACK_MAP[pack].amount;
          }
          if (d.amount) totalRevenueCents += d.amount;
        });

        const subTxSnap = await db.collectionGroup("transactions")
          .where("type", "==", "subscription").get();
        subTxSnap.forEach(doc => {
          if (doc.data().amount) totalRevenueCents += doc.data().amount;
        });

        const spendSnap = await db.collectionGroup("credit_transactions")
          .where("type", "==", "spend").get();
        spendSnap.forEach(doc => {
          creditsSpent += Math.abs(doc.data().amount || 0);
        });
      } catch (e) {
        console.warn("Collection group query failed, using per-user fallback:", e.message);

        // Fallback: iterate through each user's subcollections manually
        const allUsers = await db.collection("users").select().get();
        for (const userDoc of allUsers.docs) {
          try {
            const txDocs = await userDoc.ref.collection("transactions").get();
            txDocs.forEach(doc => {
              const d = doc.data();
              if (d.type === "credit_pack") {
                const pack = d.pack || d.credit_pack;
                if (pack && CREDIT_PACK_MAP[pack]) {
                  creditsBought += CREDIT_PACK_MAP[pack].amount;
                }
              }
              if (d.amount) totalRevenueCents += d.amount;
            });

            const creditDocs = await userDoc.ref.collection("credit_transactions").get();
            creditDocs.forEach(doc => {
              if (doc.data().type === "spend") {
                creditsSpent += Math.abs(doc.data().amount || 0);
              }
            });
          } catch (innerErr) {
            console.warn(`Fallback failed for user ${userDoc.id}:`, innerErr.message);
          }
        }
      }

      return res.status(200).json({
        totalUsers,
        activeSubscribers,
        totalPrompts,
        totalUnlocks,
        creditsBought,
        creditsSpent,
        totalRevenueCents,
      });
    } catch (err) {
      console.error("getAdminDashboardStats error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
