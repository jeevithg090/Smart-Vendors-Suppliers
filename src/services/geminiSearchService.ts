interface GeminiSearchRequest {
  query: string;
  context?: string;
  userRole: 'vendor' | 'supplier';
  searchType: 'suppliers' | 'products' | 'general';
}

interface GeminiSearchResponse {
  enhancedQuery: string;
  searchTerms: string[];
  categories: string[];
  tags: string[];
  intent: string;
  confidence: number;
  suggestions: string[];
}

interface SupplierData {
  name: string;
  description: string;
  category: string;
  tags: string[];
  location: string;
  rating: number;
  isVerified: boolean;
  isFastDelivery: boolean;
}

import { GEMINI_CONFIG, isGeminiAvailable } from '../config/gemini';

class GeminiSearchService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = GEMINI_CONFIG.API_KEY;
    this.baseUrl = GEMINI_CONFIG.BASE_URL;
  }

  isAvailable(): boolean {
    return isGeminiAvailable();
  }

  async enhanceSearchQuery(request: GeminiSearchRequest): Promise<GeminiSearchResponse> {
    if (!this.isAvailable()) {
      console.warn('Gemini API not available, using fallback');
      return this.createFallbackResponse(request.query);
    }

    try {
      const prompt = this.buildSearchPrompt(request);
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: GEMINI_CONFIG.TEMPERATURE,
            topK: GEMINI_CONFIG.TOP_K,
            topP: GEMINI_CONFIG.TOP_P,
            maxOutputTokens: GEMINI_CONFIG.MAX_TOKENS,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('No response from Gemini API');
      }

      return this.parseGeminiResponse(generatedText, request.query);
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to basic query enhancement
      return this.createFallbackResponse(request.query);
    }
  }

  private buildSearchPrompt(request: GeminiSearchRequest): string {
    const roleContext = request.userRole === 'vendor' 
      ? 'a restaurant/food business owner looking for suppliers'
      : 'a food supplier wanting to understand market demand';

    return `
You are an AI assistant helping ${roleContext} with intelligent search in a food supply marketplace.

Original Query: "${request.query}"
Search Type: ${request.searchType}
User Role: ${request.userRole}

Analyze this search query and provide a JSON response with the following structure:
{
  "enhancedQuery": "An improved, more specific version of the query",
  "searchTerms": ["key", "terms", "to", "search"],
  "categories": ["relevant", "food", "categories"],
  "tags": ["specific", "attribute", "tags"],
  "intent": "description of what the user is trying to find",
  "confidence": 0.85,
  "suggestions": ["alternative", "search", "suggestions"]
}

Food Categories: Vegetables & Fruits, Spices & Condiments, Seafood, Dairy, Grains & Pulses, Meat & Poultry, Oil & Ghee, Snacks & Beverages, Packaging Materials

Common Tags: organic, fresh, premium, traditional, wholesale, bulk, local, imported, seasonal, processed, FSSAI-certified, verified

Examples:
- "I need fresh vegetables" → categories: ["Vegetables & Fruits"], tags: ["fresh"], intent: "Find fresh vegetable suppliers"
- "organic spices near me" → categories: ["Spices & Condiments"], tags: ["organic", "local"], intent: "Find nearby organic spice suppliers"
- "bulk rice supplier" → categories: ["Grains & Pulses"], tags: ["bulk", "wholesale"], intent: "Find wholesale rice suppliers"

Respond ONLY with valid JSON, no additional text.
`;
  }

  private parseGeminiResponse(responseText: string, originalQuery: string): GeminiSearchResponse {
    try {
      // Clean the response text to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        enhancedQuery: parsed.enhancedQuery || originalQuery,
        searchTerms: Array.isArray(parsed.searchTerms) ? parsed.searchTerms : [originalQuery],
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        intent: parsed.intent || 'General search',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return this.createFallbackResponse(originalQuery);
    }
  }

  private createFallbackResponse(query: string): GeminiSearchResponse {
    const lowercaseQuery = query.toLowerCase();
    const categories: string[] = [];
    const tags: string[] = [];

    // Simple keyword matching for fallback
    if (lowercaseQuery.includes('vegetable') || lowercaseQuery.includes('fruit')) {
      categories.push('Vegetables & Fruits');
    }
    if (lowercaseQuery.includes('spice') || lowercaseQuery.includes('masala')) {
      categories.push('Spices & Condiments');
    }
    if (lowercaseQuery.includes('rice') || lowercaseQuery.includes('grain') || lowercaseQuery.includes('wheat')) {
      categories.push('Grains & Pulses');
    }
    if (lowercaseQuery.includes('dairy') || lowercaseQuery.includes('milk') || lowercaseQuery.includes('cheese')) {
      categories.push('Dairy');
    }

    if (lowercaseQuery.includes('organic')) tags.push('organic');
    if (lowercaseQuery.includes('fresh')) tags.push('fresh');
    if (lowercaseQuery.includes('premium')) tags.push('premium');
    if (lowercaseQuery.includes('bulk') || lowercaseQuery.includes('wholesale')) tags.push('bulk', 'wholesale');

    return {
      enhancedQuery: query,
      searchTerms: query.split(' ').filter(term => term.length > 2),
      categories,
      tags,
      intent: 'Find suppliers based on search terms',
      confidence: 0.6,
      suggestions: []
    };
  }

  async semanticSupplierSearch(
    query: string, 
    userRole: 'vendor' | 'supplier',
    availableSuppliers: SupplierData[]
  ): Promise<{
    results: SupplierData[];
    searchAnalysis: GeminiSearchResponse;
    relevanceScores: Map<string, number>;
  }> {
    // Get enhanced search analysis from Gemini
    const searchAnalysis = await this.enhanceSearchQuery({
      query,
      userRole,
      searchType: 'suppliers'
    });

    // Calculate semantic relevance scores
    const relevanceScores = new Map<string, number>();
    
    const scoredSuppliers = availableSuppliers.map(supplier => {
      const score = this.calculateSemanticRelevance(supplier, searchAnalysis, query);
      relevanceScores.set(supplier.name, score);
      return { supplier, score };
    });

    // Sort by relevance score and filter by minimum threshold
    const results = scoredSuppliers
      .filter(item => item.score > 0.1) // Minimum relevance threshold
      .sort((a, b) => b.score - a.score)
      .map(item => item.supplier);

    return {
      results,
      searchAnalysis,
      relevanceScores
    };
  }

  private calculateSemanticRelevance(
    supplier: SupplierData, 
    searchAnalysis: GeminiSearchResponse,
    originalQuery: string
  ): number {
    let score = 0;

    // Direct text matching (base score)
    const textFields = [supplier.name, supplier.description, supplier.location].join(' ').toLowerCase();
    const queryLower = originalQuery.toLowerCase();
    
    if (textFields.includes(queryLower)) {
      score += 0.5;
    }

    // Enhanced query matching
    const enhancedQueryLower = searchAnalysis.enhancedQuery.toLowerCase();
    if (textFields.includes(enhancedQueryLower)) {
      score += 0.3;
    }

    // Search terms matching
    searchAnalysis.searchTerms.forEach(term => {
      if (textFields.includes(term.toLowerCase())) {
        score += 0.2;
      }
    });

    // Category matching (high weight)
    if (searchAnalysis.categories.includes(supplier.category)) {
      score += 0.8;
    }

    // Tag matching
    searchAnalysis.tags.forEach(tag => {
      if (supplier.tags.some(supplierTag => 
        supplierTag.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(supplierTag.toLowerCase())
      )) {
        score += 0.3;
      }
    });

    // Quality boosters
    if (supplier.isVerified) score += 0.1;
    if (supplier.isFastDelivery) score += 0.05;
    if (supplier.rating > 4.0) score += 0.1;

    // Apply confidence multiplier
    score *= searchAnalysis.confidence;

    return Math.min(score, 1.0); // Cap at 1.0
  }

  // Generate search suggestions
  async generateSearchSuggestions(
    partialQuery: string,
    userRole: 'vendor' | 'supplier'
  ): Promise<string[]> {
    if (partialQuery.length < 2) return [];

    try {
      const prompt = `
Generate 5 smart search suggestions for a ${userRole} in a food supply marketplace.
Partial query: "${partialQuery}"

Provide suggestions that complete or enhance this query. Focus on:
- Food categories and products
- Quality indicators (organic, fresh, premium)
- Location-based searches
- Supplier attributes (verified, fast delivery)

Return ONLY a JSON array of strings, no additional text.
Example: ["fresh vegetables near me", "organic spice suppliers", "bulk rice wholesale"]
`;

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Gemini API error');
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (generatedText) {
        const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }

    // Fallback suggestions
    return this.getFallbackSuggestions(partialQuery, userRole);
  }

  private getFallbackSuggestions(partialQuery: string, userRole: 'vendor' | 'supplier'): string[] {
    const common = [
      'fresh vegetables near me',
      'organic spices suppliers',
      'bulk rice wholesale',
      'premium dairy products',
      'verified suppliers only'
    ];

    const vendorSpecific = [
      'FSSAI certified suppliers',
      'same day delivery suppliers',
      'local vegetable suppliers',
      'wholesale grain suppliers',
      'premium quality ingredients'
    ];

    const supplierSpecific = [
      'high demand products',
      'trending food categories',
      'seasonal ingredients demand',
      'bulk order opportunities',
      'restaurant supply needs'
    ];

    const baseList = userRole === 'vendor' ? vendorSpecific : supplierSpecific;
    const filtered = [...baseList, ...common].filter(suggestion =>
      suggestion.toLowerCase().includes(partialQuery.toLowerCase())
    );

    return filtered.slice(0, 5);
  }
}

export const geminiSearchService = new GeminiSearchService();
