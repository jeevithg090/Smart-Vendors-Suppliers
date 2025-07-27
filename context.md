### Product Requirements Document (PRD) for Street Food Sourcing Web App

#### Document Overview
This PRD outlines the complete plan for building a functional web app for the Tutedude Web Development Hackathon 1.0 – Solving for Street Food. The app addresses a specific pain point in India's street food ecosystem: street vendors struggling to source trusted, affordable raw materials (e.g., ingredients like flour, spices, or vegetables) from reliable suppliers. We'll focus on a niche angle—enabling vendors to discover nearby verified suppliers, compare prices in real-time, and place secure group orders to reduce costs—while building from both vendor and supplier sides.

The goal is a Minimum Demonstrable Product (MDP) that's fully functional, deployed, and pitch-ready by the deadline (July 27, 2025, 11:59 PM IST). This PRD is designed as a comprehensive guide, including every detail on structure, tech stack, development steps, frameworks, AI leverage, and troubleshooting to prevent stalls. If you get stuck, refer to the "Risks and Contingency Plans" section.

**Key Objectives** (Aligned with Hackathon Goals):
- Solve a validated, impactful problem with real user insight.
- Build a unique, practical web app (no prototypes or non-functional demos).
- Ensure simplicity, functionality, and edge-case handling.
- Incorporate AI for efficiency without placeholders.
- Achieve a compelling 5-min video pitch.

**Assumptions and Scope**:
- Team size: Flexible (solo or small team); assign roles (e.g., one for backend, one for frontend).
- Timeframe: ~36 hours left (as of July 26, 2025, 11:57 AM IST)—prioritize core features.
- Specific Pain Point: Vendors lack a trusted platform for real-time supplier matching and group buying. (Validate this quickly via quick chats with local vendors if possible, per hackathon tips.)
- Out of Scope: Advanced features like payments (use mock integrations); no physical hardware.

**Success Metrics** (Based on Evaluation Criteria):
- Fully working features (e.g., search, order placement).
- User-friendly UI (clean, intuitive).
- Unique twist: AI-powered supplier recommendations based on vendor preferences.
- Clear video demo showing both sides.

#### User Personas and Stories
- **Vendor (Street Food Seller)**: Busy, tech-limited user needing quick sourcing. Story: "As a vendor, I want to search nearby suppliers by ingredient and price so I can source affordably without haggling."
- **Supplier (Wholesaler)**: Manages inventory; wants easy order fulfillment. Story: "As a supplier, I want to update stock in real-time and receive group orders so I can sell efficiently."
- **Edge Cases**: No internet (offline support via Convex), invalid inputs (validation), no matches (fallback suggestions).

#### Features and Requirements
Prioritize 3-4 core features for a small, working MVP. All must be fully functional with error handling.

1. **User Authentication** (Both Sides):
   - Sign-up/login via email/password or Google (distinguish vendor vs. supplier roles).
   - Requirement: Secure, with role-based access (vendors can't edit supplier data).

2. **Supplier Discovery and Search (Vendor Side)**:
   - Search by location, ingredient, price range; real-time results.
   - Unique Twist: AI-recommended suppliers based on past orders or ratings.

3. **Inventory Management and Orders (Supplier Side)**:
   - Suppliers update stock/prices; vendors place individual or group orders.
   - Real-time notifications for updates (e.g., price changes).

4. **Dashboard and Tracking (Both Sides)**:
   - Vendor: Order history, comparisons.
   - Supplier: Pending orders, analytics.
   - Group Ordering: Vendors collaborate on bulk buys for discounts.

**Non-Functional Requirements**:
- Performance: Load in `).

5. **Deployment and Submission (1 Hour)**:
   - Deploy Backend: `npx convex deploy`.
   - Deploy Frontend: Push to Vercel/Netlify; set env vars for Convex URL.
   - Video: Record with Loom/Screen Recorder—demo flows, explain uniqueness (AI trust scoring), include team info.
   - Submit via Google Form: GitHub link, deployed URL, video link, LinkedIn post for bonus.

#### Backend Structure with Convex: Detailed Breakdown
Convex operates as a serverless, real-time database and backend platform, where all logic runs securely in the cloud via TypeScript functions. Unlike traditional setups, there's no need to manage servers or worry about scaling—Convex handles that automatically. The backend is the heart of your app, powering everything from data storage to real-time updates for vendor-supplier interactions.

##### 1. Schema Design: The Data Foundation
The schema defines how data is structured in Convex, akin to a database blueprint. It’s written in `convex/schema.ts` and uses document-based storage with relational capabilities via IDs and indexes for fast queries. For your street food sourcing app, the schema must support vendors, suppliers, orders, and trust mechanisms, with room for AI-driven insights.

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Vendors: Street food sellers looking for raw materials
  vendors: defineTable({
    userId: v.string(), // Unique ID from auth provider
    name: v.string(),
    email: v.string(),
    location: v.string(), // City or area, e.g., "Mumbai, Andheri"
    coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })), // For geolocation-based search
    preferences: v.array(v.string()), // Items they frequently buy, e.g., ["flour", "spices"]
    trustScore: v.number(), // AI-calculated score based on order history/reliability
  }).index("by_location", ["location"]),

  // Suppliers: Wholesalers providing raw materials
  suppliers: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    location: v.string(),
    coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    inventory: v.array(
      v.object({
        itemName: v.string(), // e.g., "Wheat Flour"
        quantity: v.number(), // Stock available
        pricePerUnit: v.number(), // Price per kg or unit
        unit: v.string(), // e.g., "kg", "liter"
        lastUpdated: v.number(), // Timestamp for freshness
      })
    ),
    trustScore: v.number(), // AI-calculated based on delivery reliability/reviews
  }).index("by_location", ["location"]),

  // Orders: Transactions between vendors and suppliers
  orders: defineTable({
    vendorId: v.id("vendors"),
    supplierId: v.id("suppliers"),
    items: v.array(
      v.object({
        itemName: v.string(),
        quantity: v.number(),
        priceAtOrder: v.number(),
      })
    ),
    totalCost: v.number(),
    status: v.string(), // e.g., "pending", "confirmed", "delivered"
    orderType: v.string(), // "individual" or "group"
    createdAt: v.number(), // Timestamp
    groupOrderId: v.optional(v.id("groupOrders")), // Link to group order if applicable
  }).index("by_status", ["status"]).index("by_vendor", ["vendorId"]).index("by_supplier", ["supplierId"]),

  // Group Orders: Collaborative bulk buying for cost reduction
  groupOrders: defineTable({
    initiatorId: v.id("vendors"), // Vendor who started the group order
    itemName: v.string(),
    targetQuantity: v.number(), // Total needed for bulk discount
    currentQuantity: v.number(), // Current committed amount
    supplierId: v.optional(v.id("suppliers")), // Chosen supplier once finalized
    participants: v.array(
      v.object({
        vendorId: v.id("vendors"),
        quantity: v.number(),
      })
    ),
    status: v.string(), // "open", "locked", "placed"
    deadline: v.number(), // When group order closes
  }).index("by_status", ["status"]),

  // Ratings/Reviews: For trust-building, used in AI trust scoring
  ratings: defineTable({
    fromId: v.id("vendors"), // Vendor rating supplier
    toId: v.id("suppliers"), // Supplier being rated
    orderId: v.id("orders"),
    score: v.number(), // 1-5
    comment: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_supplier", ["toId"]),
});
```

**Why This Schema?**
- Granularity: Separates vendors, suppliers, and orders for clear data management. Indexes (e.g., `by_location`) enable fast searches, critical for real-time supplier discovery.
- Group Orders: A unique feature allowing vendors to pool orders for bulk discounts, addressing cost pain points directly.
- Trust Scores: Fields like `trustScore` store AI/ML-calculated values to recommend reliable partners, enhancing the solution's impact.
- Scalability: Convex’s document store with relational IDs supports growth without performance hits.

##### 2. Backend Functions: Queries and Mutations
Convex backend logic is split into queries (read data) and mutations (write data), written as TypeScript functions in files under the `convex/` directory. These run server-side, ensuring security (no client-side data leaks). Here’s how they power your app with specific examples.

- **Queries (Read Operations)**: Fetch data reactively; frontend updates automatically via hooks.
  - **Supplier Search**: File `convex/suppliers.ts`
    ```typescript
    import { query } from "./_generated/server";
    import { v } from "convex/values";

    export const listSuppliers = query({
      args: { location: v.string(), item: v.optional(v.string()) },
      handler: async (ctx, args) => {
        let query = ctx.db.query("suppliers").filter((q) => q.eq(q.field("location"), args.location));
        if (args.item) {
          query = query.filter((q) =>
            q.some(q.field("inventory"), (inv) => q.eq(inv.field("itemName"), args.item))
          );
        }
        const suppliers = await query.order("desc", "trustScore").take(10);
        return suppliers.map((s) => ({
          ...s,
          inventory: s.inventory.filter((i) => i.quantity > 0), // Only show in-stock items
        }));
      },
    });
    ```
    - **Purpose**: Vendors search for nearby suppliers, optionally by item (e.g., "rice"). Sorted by AI trust score for reliability.
    - **Edge Case**: Returns empty array if no matches; frontend handles fallback suggestions.

  - **Active Group Orders**: File `convex/groupOrders.ts`
    ```typescript
    export const getOpenGroupOrders = query({
      args: { location: v.string() },
      handler: async (ctx, args) => {
        return await ctx.db
          .query("groupOrders")
          .filter((q) => q.eq(q.field("status"), "open"))
          .filter((q) => q.lt(q.field("deadline"), Date.now()))
          .take(5);
      },
    });
    ```
    - **Purpose**: Shows vendors open group orders to join for bulk savings.

- **Mutations (Write Operations)**: Update data with transactional guarantees.
  - **Place Order**: File `convex/orders.ts`
    ```typescript
    import { mutation } from "./_generated/server";
    import { v } from "convex/values";

    export const placeOrder = mutation({
      args: {
        vendorId: v.id("vendors"),
        supplierId: v.id("suppliers"),
        items: v.array(v.object({ itemName: v.string(), quantity: v.number(), priceAtOrder: v.number() })),
        totalCost: v.number(),
        orderType: v.string(),
      },
      handler: async (ctx, args) => {
        const orderId = await ctx.db.insert("orders", {
          ...args,
          status: "pending",
          createdAt: Date.now(),
        });
        // Update supplier inventory
        const supplier = await ctx.db.get(args.supplierId);
        const updatedInventory = supplier.inventory.map((item) => {
          const ordered = args.items.find((i) => i.itemName === item.itemName);
          return ordered ? { ...item, quantity: item.quantity - ordered.quantity } : item;
        });
        await ctx.db.patch(args.supplierId, { inventory: updatedInventory });
        return orderId;
      },
    });
    ```
    - **Purpose**: Vendors place orders (individual or linked to group); inventory updates transactionally to prevent over-ordering.
    - **Edge Case**: If inventory drops below zero during race conditions, Convex’s transactions roll back.

- **Authentication**: File `convex/auth.ts`
  - Use Convex’s built-in auth or integrate with Clerk for role-based access.
  - Example: Middleware ensures only vendors place orders, suppliers update inventory.
  - **Purpose**: Secures data; prevents unauthorized access (e.g., vendors editing supplier stock).

**How Backend Works in Convex**:
- **Core Mechanism**: Everything is serverless. Queries fetch data reactively; mutations update it atomically. Real-time sync happens via subscriptions—frontend hooks auto-update UI.
- **Leveraging Convex**: Use its type safety to prevent bugs (e.g., auto-generated types). For AI, run logic in mutations (e.g., query AI for insights before saving orders).
- **Server-Side Logic**: All functions execute in Convex’s cloud, not client-side, ensuring data integrity. No direct database access from frontend—only via defined functions.
- **Real-Time Sync**: Convex pushes updates to subscribed clients (via React hooks like `useQuery`). E.g., if a supplier updates price, all vendor searches reflect it instantly.
- **Transactions**: Mutations are ACID-compliant; if inventory update fails, order placement rolls back.
- **Scalability**: Convex auto-scales; no need to tweak for concurrent users during demo.

##### 3. User Flow Mapping: Backend Perspective
Here’s how backend supports the app’s user flows for both personas. Each step maps to functions above.

- **Vendor Flow** (Finding and Ordering Materials):
  1. **Login**: Backend authenticates via `auth.ts`, assigns vendor role, returns user data.
  2. **Search Suppliers**: Calls `listSuppliers` query with location/item; returns sorted list by trust score.
  3. **Join Group Order (Optional)**: Queries `getOpenGroupOrders`; mutation `joinGroupOrder` adds vendor’s contribution.
  4. **Place Order**: Mutation `placeOrder` creates order, deducts supplier inventory.
  5. **Track Order**: Query `getOrdersByVendor` fetches real-time status updates.

- **Supplier Flow** (Managing Inventory and Orders):
  1. **Login**: Authenticated as supplier role.
  2. **Update Inventory**: Mutation `updateInventory` adjusts stock/prices; triggers real-time sync to vendors.
  3. **View Orders**: Query `getOrdersBySupplier` shows pending/confirmed orders.
  4. **Confirm Delivery**: Mutation updates order status to “delivered”; triggers vendor notification.

- **Edge Cases Handled by Backend**:
  - No suppliers nearby: Query returns empty list; frontend suggests broader location search.
  - Group order deadline passed: Backend rejects join attempt with error code.
  - Inventory mismatch: Transactional mutations prevent overselling.

##### 4. AI/ML Integration: Elevating the Solution
AI and ML can transform your app from functional to standout by addressing trust, personalization, and efficiency—core pain points for vendors. Since the hackathon encourages AI use (as long as it’s functional), here’s how to integrate it into the Convex backend for real impact.

- **Trust Scoring with ML**:
  - **What**: Calculate `trustScore` for vendors and suppliers using order history, delivery times, and ratings.
  - **How**: Write a Convex mutation `calculateTrustScore` that runs periodically (via scheduled functions in Convex).
    ```typescript
    import { mutation, internalMutation } from "./_generated/server";

    export const calculateTrustScore = internalMutation({
      handler: async (ctx) => {
        const suppliers = await ctx.db.query("suppliers").collect();
        for (const supplier of suppliers) {
          const ratings = await ctx.db.query("ratings").filter((q) => q.eq(q.field("toId"), supplier._id)).collect();
          const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 3;
          const completedOrders = await ctx.db.query("orders")
            .filter((q) => q.eq(q.field("supplierId"), supplier._id))
            .filter((q) => q.eq(q.field("status"), "delivered"))
            .count();
          const trustScore = avgRating * 0.6 + (completedOrders / (completedOrders + 1)) * 2; // Weighted formula
          await ctx.db.patch(supplier._id, { trustScore });
        }
        // Similar logic for vendors
      },
    });
    ```
  - **External AI API**: Call OpenAI or a lightweight ML model API (e.g., via Replicate) from Convex to refine scoring with sentiment analysis of comments.
  - **Impact**: Vendors see only reliable suppliers upfront, solving trust issues directly.

- **Personalized Supplier Recommendations with AI**:
  - **What**: Recommend suppliers based on vendor preferences and past orders.
  - **How**: In `listSuppliers`, add an AI layer:
    ```typescript
    export const listSuppliers = query({
      args: { location: v.string(), item: v.optional(v.string()), vendorId: v.id("vendors") },
      handler: async (ctx, args) => {
        const vendor = await ctx.db.get(args.vendorId);
        // Base query
        let suppliers = await ctx.db.query("suppliers").filter((q) => q.eq(q.field("location"), args.location)).collect();
        // AI logic: Sort by match with vendor preferences
        const preferredItems = vendor.preferences || [];
        suppliers = suppliers.sort((a, b) => {
          const aMatch = a.inventory.some((i) => preferredItems.includes(i.itemName)) ? 1 : 0;
          const bMatch = b.inventory.some((i) => preferredItems.includes(i.itemName)) ? 1 : 0;
          return (bMatch - aMatch) || (b.trustScore - a.trustScore);
        });
        // Optionally, call OpenAI API for advanced matching (mocked here for simplicity)
        return suppliers.slice(0, 10);
      },
    });
    ```
  - **External Integration**: Use OpenAI API (via Convex HTTP endpoints) for natural language matching, e.g., "Find suppliers good for spicy chaat ingredients."
  - **Impact**: Saves vendor time, makes app sticky with tailored results.

- **Predictive Inventory Alerts with ML**:
  - **What**: Alert suppliers to restock based on demand trends; notify vendors of potential shortages.
  - **How**: Convex scheduled function analyzes order frequency:
    ```typescript
    export const predictInventoryNeeds = internalMutation({
      handler: async (ctx) => {
        const suppliers = await ctx.db.query("suppliers").collect();
        for (const supplier of suppliers) {
          const recentOrders = await ctx.db.query("orders")
            .filter((q) => q.eq(q.field("supplierId"), supplier._id))
            .filter((q) => q.gt(q.field("createdAt"), Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
            .collect();
          // Simple ML logic: If high order rate, suggest restock
          supplier.inventory.forEach(async (item) => {
            const orderedQty = recentOrders.reduce(
              (sum, o) => sum + (o.items.find((i) => i.itemName === item.itemName)?.quantity || 0), 0
            );
            if (orderedQty > item.quantity * 0.5) {
              // Mock notification: In real app, send email/push
              console.log(`Alert: ${supplier.name} restock ${item.itemName}`);
            }
          });
        }
      },
    });
    ```
  - **External ML**: Integrate a time-series forecasting model via API (e.g., Google Cloud AI) for accurate predictions.
  - **Impact**: Prevents stockouts, a major vendor pain point, ensuring supply continuity.

- **Group Order Optimization with AI**:
  - **What**: Suggest optimal group order quantities/deadlines based on participant count and supplier discounts.
  - **How**: Mutation `createGroupOrder` calls an AI endpoint to compute targets (mocked as fixed logic for MVP).
  - **Impact**: Maximizes cost savings, a unique selling point for your app.

**Implementing AI/ML in Convex**:
- API Calls: Use Convex’s HTTP client to call OpenAI/Replicate APIs from mutations. Store keys securely in Convex environment variables.
- Lightweight Models: For hackathon scope, hard-code simple algorithms (as shown) or use pre-trained API outputs. Avoid training models—use inference only for speed.
- Functionality Check: Test AI outputs in Convex dashboard; ensure fallback logic if API fails (e.g., default to trustScore sorting).
- Cursor/ChatGPT Help: Prompt "Write Convex mutation for OpenAI API call to recommend suppliers based on order history." Copy-paste, test, iterate.

##### 5. Backend Security and Performance
- Access Control: Convex functions enforce role checks (e.g., `if (ctx.auth.getUserIdentity().role !== "vendor") throw "Unauthorized";`). No client-side data exposure.
- Rate Limiting: Convex handles throttling; for custom limits (e.g., max 10 searches/min), track via a table.
- Performance: Indexes in schema (e.g., `by_location`) ensure sub-second queries. Real-time sync via WebSockets has minimal latency.
- Error Handling: Backend returns structured errors (e.g., `{ success: false, error: "No suppliers found" }`); frontend displays user-friendly messages.

#### Why This Backend Solves the Problem Better
- Trust via AI: Calculating and using trust scores addresses the core issue of unreliable sourcing, a pain point no basic app tackles.
- Real-Time Efficiency: Convex’s sync ensures vendors see live inventory, avoiding wasted trips or calls—a practical fix for chaotic street ecosystems.
- Group Ordering: Backend logic for collaborative buying cuts costs, directly impacting vendor livelihoods.
- Scalable and Secure: Serverless design means no maintenance overhead; focus remains on features, not infrastructure.

#### Leveraging AI Tools
- **Cursor**: Use for all coding—predicts next lines, explains code, fixes bugs. E.g., compose "Implement Convex auth in React" and let it generate.
- **ChatGPT**: Ideation ("Brainstorm unique features for vendor app"), code gen ("Write TypeScript for group orders"), debugging ("Why is useQuery undefined?").
- **Integration**: Call AI APIs from backend for features like personalized recommendations, ensuring they're functional (not theoretical).
- **Efficiency Tip**: If stalled, prompt "Step-by-step guide to [specific task]" in ChatGPT, then implement in Cursor.

#### Risks and Contingency Plans
- **Stall on Backend**: Fall back to simpler schema; use Convex templates.
- **Frontend Bugs**: Test in isolation; use AI to rewrite hooks.
- **Time Crunch**: Cut to 2 features if needed; focus on working core.
- **General Stuck?**: Break into micro-tasks (e.g., "Just set up auth first"). Search docs or ask in Convex Discord. Remember hackathon tips: Simpler is smarter.

- **If You Stall: Troubleshooting Backend**
  - Schema Errors: Validate field types in Convex dashboard; simplify if needed (e.g., drop `coordinates` for MVP).
  - Function Bugs: Log outputs in mutations (`console.log`); use Cursor to ask "Debug Convex query returning empty array."
  - AI Integration Fails: Hard-code fallback logic (e.g., sort by price if trust score calc fails); mock API responses for demo.
  - Docs and Community: Check convex.dev/docs for schema/function examples; join Convex Discord for quick help.

This PRD is your all-in-one blueprint—follow it sequentially to build efficiently. You've got the tools and plan; execute now to hit the deadline! If specifics change, iterate on this document. Good luck!


Hackathon Problem Statement:
# Tutedude’s Web Development Hackathon 1.0 – Solving for Street Food

## Background

India’s street food scene is vibrant, loved, and chaotic. But behind every delicious plate of chaat or dosa, there’s a hidden struggle, raw material sourcing. Most street vendors have to manage quality, pricing, and availability on their own. There’s no structured system, no trusted platform, and definitely no easy access to affordable supplies.

This Web Hackathon invites you to solve this real, everyday problem through tech. Your job isn’t just to build a cool UI, it’s to create a digital solution that could actually make a difference to the lives of food vendors.

<aside>
💡

**Tech Stack:** You are free to use any tech stack of your choice. Tools like Replit, Firebase, Lovable, Google Stitch, ChatGPT, and others are allowed. Hosting can be done via Netlify, Vercel, or any other preferred platform.

</aside>

![image.png](attachment:63465cba-ffe8-43bd-baae-7f3b38615399:image.png)

---

## The Problem

We’re not giving you a fixed problem statement. What you have is a broad, open-ended challenge:

**“In India, street food vendors have a problem with bringing in raw materials from trusted and cheap vendors.”**

Explore this ecosystem. Think about how vendors operate, where they face pain, how the supply chain works, and how trust plays a role. Talk to real people, observe, question, validate.

Your task is to pick a specific angle of this issue and build a web-based digital solution that solves it.

---

## What You Have To Do

- Pick a real, specific pain point within the raw material sourcing problem
- Develop a clear, functional, user-first web app
- Build a fully functional product (no figma-only solution)
- Create the product from both ends: vendor side and service provider side
- Submit a video submission duration 5-6 min
- Present it in a crisp and compelling pitch
- Make sure your product is live and hosted (Netlify, Vercel, etc.)

<aside>
👉🏻

You can (and are encouraged to) use **AI** to solve real problems. But if you’re using AI, the solution musty be **fully functional and working**, not just theoretical or placeholder-based. 

Use whatever helps you build fast. Frontend, backend, AI tools, API. **Go crazy, as long as it's a functioning web app.**

Feel free to use tools and platforms like

**Replit, Lovable, Firebase Studio, Google Stitch, ChatGPT, custom APIs, or any tech stack/tool** that helps you bring the idea to life.

</aside>

---

## What You Should Not Do

- Don’t copy an existing app and just redesign the UI.
- Don’t solve a generic problem without any real insight or context.
- Avoid dumping every idea into one solution. Simpler is smarter.
- Don’t submit without testing your concept with real users or scenarios.

---

## Objectives of This Hackathon

This event will address the above issues by encouraging students to:

1. Collaborate and use their creativity to solve a very broad and abstract problem.
2. Learn the process of product building, including ideation, design, development, and pitching.
3. Build a Minimum Demonstrable Product (MDP) for the problem.

---

## Solution Guidelines

The solution must be a **digital web-based solution** (no physical/hybrid ideas). You’re encouraged to integrate custom algorithms, AI models, or other advanced tech to boost functionality.

You’re free to choose any tech stack that fits your approach.

The goal is to build a unique, practical, and functional solution to the given abstract problem.

**Note:** Don't make a landing page or website showcasing the features. We need the **actual working solution** that directly solves the core problem. Focus entirely on the **solution, not its presentation**.

<aside>
⚠️

**Design Guidelines**

You can use any design system or style you are comfortable with. It can be Material, iOS, Shadcn or your own setup. Just make sure it is clean, easy to follow and not confusing. Do not overload the screen. Use simple patterns that anyone can understand. 

</aside>

**Example Scenario**

Let’s say the broad problem is

**“Street food vendors struggle to find affordable raw materials.”**

Bad solution: A basic website saying "Buy cheap materials here" with no actual sourcing system.

Good solution: A web app where vendors can search verified suppliers nearby, compare prices, place group orders, or even track delivery.

*Note: this example is just for understanding. Do not use this idea as a solution, otherwise no evaluation will be done.*

---

## Deliverables

| Solution explanation video (Mandatory) | A short video of about **5 mins max**, where you explain your idea and show how the flow works. Keep it clear and simple. Keep it crisp. Focus on showing how it works. Skip button-by-button walkthroughs. |
| --- | --- |
| Coded File (GitHub) | All the source code files uploaded to a GitHub repository. |
| Public Solution Deployed Link | Provide a working link to your coded solution that is hosted on a server like Netlify, Vercel, or any other hosting platform. This should not be a design prototype but the actual fully functional solution. Ensure the link is accessible publicly. |

<aside>
⚠️

Do not copy from any source. Any plagiarism will result in team disqualification.

</aside>

---

## Evaluation Criteria

1. Is the chosen problem relevant and impactful?
2. How unique the solution is, what's different about it?
3. Does the prototype work as intended and is completely functional?
4. How user-friendly and visually appealing is the design?
5. How clearly is the problem and solution communicated in the demo video? ***(VERY IMPORTANT, BE CREATIVE)***

<aside>
💡

Note: The web app should be complete and fully functional. ***We will judge based on the number of perfectly working features in the dedicated time duration.*** Submitting half-built or broken links will affect your score.

</aside>

---

### Tips to Win

- Pick a very specific use-case. Niche > Broad.
- Validate your problem with real people.
- Build something that works, even if it’s small.
- Make your demo video feel like a product pitch, don’t bore us ;p
- Prioritize simplicity, especially in UI and storytelling.
- Don’t focus only on tech, explain the *why* behind your choices.

<aside>
💡

Doesn’t matter if you’ve got a ton of features, if they don’t work properly, they’re useless. Every feature you build should be fully functional and handle edge cases too.

</aside>

---

## **Post Your work on Linkedin & get 10 Extra Points**

<aside>
🔥

- Write about your hackathon experience on LinkedIn with Tutedude | About your teamwork | What you have learned throughout the hackathon and more.
- Post (Screenshot or Video) of your final Design and on LinkedIn
- Tag your Teammates and Tutedude (on LinkedIn)

https://www.linkedin.com/company/tutedudeofficial/

- Add the link of your LinkedIn post in this google form during submission.
</aside>

---

## Timeline

- **Hackathon Launch:** 25th July 2025
- **Submission Deadline:** **July 27, 11:59 PM**
- **Winner Team Prize:** ₹8,000/- (Cash)
- **Winners Announcement:** Within a week
- **Participation Certificates:** All participants will receive a certificate.

---

## Submission Guidelines

- All submissions should be made in a digital format.
- Submission should be only one per team.
- Solution explanation video must be uploaded to Drive or YouTube (unlisted) and linked.
- Make all links public, otherwise, they won’t be evaluated.

<aside>
⚠️

- Solution explanation video should not exceed **5 minutes.**
- Team information (roles, names, contributions) must also be included in the Solution explanation video or the design file. **This is mandatory.**
</aside>

**NOTE: Failing to include team member information may result in difficulties identifying the ownership of the submission.**

---

## Solution Submission Link

<aside>
👉🏻

https://forms.gle/5feuV5BmgZ1qKoiX7

</aside>

**DEADLINE: JULY 27 2025, 11:59PM**

---

## Resources (Valuable)

https://youtu.be/JpYA7WXkHyI?si=rvd_JdXmEeY1tMAD

https://youtu.be/mtn31hh6kU4?si=01Jyk6eoCgRZ8n5v

https://youtu.be/bEusrD8g-dM?si=73g0vZ8dftjVPbCW

---

## Who This Is For

This is for students, builders, developers designers, and aspiring founders who:

- Want to build something impactful and portfolio-worthy
- Enjoy solving open-ended problems
- Care about product thinking, user experience, and technology
- Want to push beyond tutorials and templates

**Take your time to understand the problem. Do not jump into Solution directly. Think like a user and a builder.** 

<aside>
📌

- ***A NOTE FOR YOU :)***
    
    Your Roles:
    Whether you're a designer, developer, or problem solver, this Hackathon needs you! Here's how you can shine in your role:
    
    🎨 If You’re a Designer:
    Your strength is empathy and clarity.
    Dive deep into the user’s journey.
    Create clean, intuitive, and user-first designs.
    Translate chaos into simplicity using Figma/XD or even pen & paper.
    
    What you bring: User flow, wireframes, prototypes, and final UI.
    
    💻 If You’re a Developer:
    Your strength is execution and logic.
    Convert the team’s ideas into real, functional tools.
    Set up backend systems, connect APIs, build interfaces that work.
    Focus on performance, usability, and security.
    
    What you bring: Functional MVP, GitHub repo, and deployed link.
    
    🧠 If You’re a Problem Solver (PM, Thinker, Researcher):
    Your strength is critical thinking and user insight.
    Talk to real users, validate the idea, define the real pain point.
    Keep the team focused on solving the right problem.
    Ensure the solution is practical, scalable, and pitch-ready.
    
    What you bring: Research notes, problem framing, and pitch clarity.
    
    Don’t worry if you’re not a coding expert, designer, or experienced builder.
    
    Today, AI tools and smart platforms can help you create real solutions — fast.
    
    Here are some powerful tools you can use:
    
    Lovable – Generate working MVPs using AI (great for quick backend + frontend)
    
    UXPilot – Get AI help for user research, personas, journey maps, etc.
    
    Whimsical – Make user flows, wireframes, and idea maps visually
    
    BoltAI / ChatGPT – Use AI to brainstorm ideas, write content, or even help code
    
    Replit / Firebase / Glide / Bravo Studio – No-code or low-code platforms to build fast
    
    Canva / Figma AI – Design stunning UI with drag-and-drop or AI-assisted suggestions
    
    You don’t need to know everything. You just need to start.
    
</aside>

---

## FAQs

- **What kind of problem will we be solving?**
    
    The problem will be broad and open-ended, allowing you to come up with unique and creative solutions.
    
- **Is there any restriction on the technology stack we use?**
    
    No, you are free to use any tools, programming languages, or technologies you prefer for the solution.
    
- **Is mentorship available during the event?**
    
    Yes, mentors will be available during the hackathon to guide you and answer your questions.
    
- **What if someone in our team drops out during the event?**
    
    Your team can continue with the remaining members, but you will need to adjust roles and responsibilities accordingly.
    
- **Will our solution remain our intellectual property?**
    
    Yes, the solution you create will belong to you and your team.
    
- **Can we use AI, ChatGPT, third-party tools, APIs, or libraries in our solution?**
    
    Yes You can.