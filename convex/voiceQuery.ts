import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// API configuration
const SARVAM_API_KEY = "sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg";
const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Google Translate API configuration (fallback)
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || "";

interface SarvamResponse {
  transcript: string;
  language: string;
  confidence?: number;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
    }>;
  };
}

export const processVoiceQuery = mutation({
  args: { 
    audio: v.array(v.number()), // Audio data as Uint8Array
    userRole: v.string() // "vendor" or "supplier"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    try {
      // Step 1: Convert audio data back to blob for Sarvam API
      const audioBlob = new Blob([new Uint8Array(args.audio)], { 
        type: 'audio/webm;codecs=opus' 
      });

      // Step 2: Transcribe with Sarvam API (Multilingual STT)
      const sarvamResponse = await fetch(SARVAM_STT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SARVAM_API_KEY}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBlob,
      });

      if (!sarvamResponse.ok) {
        throw new Error(`Sarvam API error: ${sarvamResponse.status} ${sarvamResponse.statusText}`);
      }

      const sarvamData: SarvamResponse = await sarvamResponse.json();
      const transcribedText = sarvamData.transcript;
      const detectedLanguage = sarvamData.language || 'en';

      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error("No speech detected. Please try speaking clearly.");
      }

      // Step 3: Translate to English if not already English
      let englishText = transcribedText;
      if (detectedLanguage !== 'en' && GOOGLE_TRANSLATE_API_KEY) {
        try {
          const translateResponse = await fetch(
            `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                q: transcribedText,
                target: 'en',
                source: detectedLanguage,
              }),
            }
          );

          if (translateResponse.ok) {
            const translateData: GoogleTranslateResponse = await translateResponse.json();
            englishText = translateData.data.translations[0].translatedText;
          }
        } catch (translateError) {
          console.warn("Translation failed, using original text:", translateError);
          // Continue with original text if translation fails
        }
      }

      // Step 4: Gather context data based on user role
      let contextData: any = {};
      
      if (args.userRole === 'supplier') {
        // Get supplier data
        const supplier = await ctx.db
          .query("suppliers")
          .filter((q) => q.eq(q.field("userId"), identity.subject))
          .first();

        if (supplier) {
          // Get inventory data
          const inventory = await ctx.db
            .query("inventory")
            .filter((q) => q.eq(q.field("supplierId"), supplier._id))
            .collect();

          // Get recent orders
          const recentOrders = await ctx.db
            .query("orders")
            .filter((q) => q.eq(q.field("supplierId"), supplier._id))
            .order("desc")
            .take(5);

          contextData = {
            supplier: {
              businessName: supplier.businessName,
              categories: supplier.categories,
              trustScore: supplier.trustScore,
              isVerified: supplier.isVerified,
            },
            inventory: inventory.map(item => ({
              itemName: item.itemName,
              currentStock: item.currentStock,
              unit: item.unit,
              pricePerUnit: item.pricePerUnit,
              isAvailable: item.isAvailable,
            })),
            recentOrders: recentOrders.map(order => ({
              status: order.status,
              totalCost: order.totalCost,
              createdAt: order.createdAt,
            })),
            stats: {
              totalProducts: inventory.length,
              availableProducts: inventory.filter(item => item.isAvailable).length,
              lowStockItems: inventory.filter(item => item.currentStock < 10).length,
              totalOrders: recentOrders.length,
            }
          };
        }
      } else if (args.userRole === 'vendor') {
        // Get vendor data
        const vendor = await ctx.db
          .query("vendors")
          .filter((q) => q.eq(q.field("userId"), identity.subject))
          .first();

        if (vendor) {
          // Get recent orders
          const recentOrders = await ctx.db
            .query("orders")
            .filter((q) => q.eq(q.field("vendorId"), vendor._id))
            .order("desc")
            .take(5);

          // Get active requests
          const activeRequests = await ctx.db
            .query("requests")
            .filter((q) => q.eq(q.field("vendorId"), vendor._id))
            .filter((q) => q.eq(q.field("status"), "open"))
            .collect();

          contextData = {
            vendor: {
              businessName: vendor.businessName,
              businessType: vendor.businessType,
              trustScore: vendor.trustScore,
              isVerified: vendor.isVerified,
            },
            recentOrders: recentOrders.map(order => ({
              status: order.status,
              totalCost: order.totalCost,
              createdAt: order.createdAt,
            })),
            activeRequests: activeRequests.map(request => ({
              itemName: request.itemName,
              quantity: request.quantity,
              urgency: request.urgency,
              status: request.status,
            })),
            stats: {
              totalOrders: recentOrders.length,
              activeRequests: activeRequests.length,
              totalSpent: recentOrders.reduce((sum, order) => sum + order.totalCost, 0),
            }
          };
        }
      }

      // Step 5: Create prompt for OpenRouter
      const systemPrompt = `You are a helpful AI assistant for a food supply chain platform called "Smart Street". 
      
You help ${args.userRole}s with their business queries. Be concise, helpful, and professional.

Available context data: ${JSON.stringify(contextData, null, 2)}

User query: "${englishText}"

Please provide a helpful response based on the available data. If the query is about:
- Inventory: Use the inventory data to answer stock levels, prices, availability
- Orders: Use order history and status information
- Business metrics: Use the stats data
- General questions: Provide helpful guidance

Keep responses under 150 words and be conversational but professional.`;

      // Step 6: Send to OpenRouter for intelligent response
      const openRouterResponse = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://smart-street.app',
          'X-Title': 'Smart Street Voice Assistant',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: englishText,
            },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!openRouterResponse.ok) {
        throw new Error(`OpenRouter API error: ${openRouterResponse.status} ${openRouterResponse.statusText}`);
      }

      const openRouterData: OpenRouterResponse = await openRouterResponse.json();
      const aiResponse = openRouterData.choices[0]?.message?.content || 
        "I'm sorry, I couldn't process your request. Please try again.";

      // Step 7: Log the voice query
      await ctx.db.insert("voiceQueries", {
        userId: identity.subject,
        userRole: args.userRole,
        queryText: transcribedText,
        language: detectedLanguage,
        englishText: englishText,
        response: aiResponse,
        createdAt: Date.now(),
      });

      // Step 8: Return response
      return {
        answer: aiResponse,
        originalText: detectedLanguage !== 'en' ? transcribedText : undefined,
        language: detectedLanguage,
      };

    } catch (error) {
      console.error("Voice query processing error:", error);
      
      // Log error in database
      await ctx.db.insert("voiceQueries", {
        userId: identity.subject,
        userRole: args.userRole,
        queryText: "Error processing voice query",
        language: "en",
        englishText: "Error processing voice query",
        response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        createdAt: Date.now(),
      });

      throw new Error(
        error instanceof Error 
          ? error.message 
          : "Failed to process voice query. Please try again."
      );
    }
  },
});

// Query to get voice query history
export const getVoiceQueryHistory = query({
  args: { 
    userRole: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const limit = args.limit || 10;
    
    let query = ctx.db
      .query("voiceQueries")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject));

    if (args.userRole) {
      query = query.filter((q) => q.eq(q.field("userRole"), args.userRole));
    }

    return await query.order("desc").take(limit).collect();
  },
}); 