import { VOICE_QUERY_CONFIG } from '../config/voiceQuery';

interface FilterParsingRequest {
  text: string;
  language: string;
  currentFilters?: any;
  userContext?: {
    role: 'vendor' | 'supplier';
    location?: string;
    preferences?: any;
  };
}

interface FilterParsingResponse {
  filters: {
    location?: string;
    priceRange?: { min: number; max: number };
    deliveryTime?: string;
    quality?: string;
    categories?: string[];
    fssaiRequired?: boolean;
  };
  confidence: number;
  explanation: string;
  suggestions?: string[];
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterFilterService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.VITE_OPENROUTER_API_KEY || '';
    this.baseUrl = VOICE_QUERY_CONFIG.AI_SERVICES.openRouter.baseUrl;
    this.model = VOICE_QUERY_CONFIG.AI_SERVICES.openRouter.model;
  }

  /**
   * Parse natural language text into structured filters using OpenRouter
   */
  async parseFilters(request: FilterParsingRequest): Promise<FilterParsingResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(request.userContext);
      const userPrompt = this.buildUserPrompt(request);

      const response = await this.callOpenRouter({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        functions: [this.getFilterParsingFunction()],
        temperature: 0.3,
        max_tokens: 500
      });

      return this.parseOpenRouterResponse(response, request.text);
    } catch (error) {
      console.error('Error parsing filters with OpenRouter:', error);
      throw new Error('Failed to parse filter criteria. Please try again.');
    }
  }

  /**
   * Generate voice response for applied filters
   */
  async generateFilterResponse(
    appliedFilters: any,
    language: string,
    userContext?: any
  ): Promise<string> {
    try {
      const systemPrompt = `You are a helpful assistant for a street food vendor sourcing platform. 
      Generate a brief, friendly response in ${language} confirming the applied filters.
      Keep it conversational and under 50 words.`;

      const userPrompt = `The user has applied these filters: ${JSON.stringify(appliedFilters)}. 
      Confirm what filters were applied in a natural way.`;

      const response = await this.callOpenRouter({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 100
      });

      return response.choices[0]?.message?.content || 'Filters applied successfully.';
    } catch (error) {
      console.error('Error generating filter response:', error);
      return 'Filters applied successfully.';
    }
  }

  /**
   * Suggest filter improvements based on user query
   */
  async suggestFilterImprovements(
    originalQuery: string,
    parsedFilters: any,
    userContext?: any
  ): Promise<string[]> {
    try {
      const systemPrompt = `You are an expert in helping street food vendors find suppliers. 
      Suggest 2-3 additional filter criteria that might help narrow down the search based on the user's query.
      Focus on practical, commonly used filters like location, price, quality, delivery time, or certification.`;

      const userPrompt = `User query: "${originalQuery}"
      Current filters: ${JSON.stringify(parsedFilters)}
      
      Suggest additional filters that might be helpful:`;

      const response = await this.callOpenRouter({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.6,
        max_tokens: 200
      });

      const suggestions = response.choices[0]?.message?.content || '';
      return suggestions.split('\n').filter(s => s.trim().length > 0).slice(0, 3);
    } catch (error) {
      console.error('Error generating filter suggestions:', error);
      return [];
    }
  }

  private buildSystemPrompt(userContext?: any): string {
    return `You are an AI assistant specialized in parsing natural language filter criteria for a street food vendor sourcing platform in India.

Your task is to extract structured filter information from user voice commands. The platform helps vendors find suppliers for ingredients and food items.

Available filter types:
1. location: "nearby", "within Xkm", specific area names
2. priceRange: {min: number, max: number} in Indian Rupees
3. deliveryTime: "same_day", "next_day", "express", "standard"
4. quality: "premium", "organic", "fresh", "grade_a"
5. categories: ["vegetables", "fruits", "spices", "grains", "pulses", "dairy"]
6. fssaiRequired: boolean (Food Safety and Standards Authority of India certification)

Context:
- User role: ${userContext?.role || 'vendor'}
- User location: ${userContext?.location || 'India'}
- Platform language support: Hindi, Tamil, Telugu, Bengali, English

Parse the user's natural language input and extract relevant filters. Be flexible with language variations and synonyms.`;
  }

  private buildUserPrompt(request: FilterParsingRequest): string {
    let prompt = `Parse this filter request: "${request.text}"`;
    
    if (request.language !== 'en') {
      prompt += `\nOriginal language: ${request.language}`;
    }
    
    if (request.currentFilters && Object.keys(request.currentFilters).length > 0) {
      prompt += `\nCurrent filters: ${JSON.stringify(request.currentFilters)}`;
    }
    
    prompt += `\nExtract and return the filter criteria using the parseFilters function.`;
    
    return prompt;
  }

  private getFilterParsingFunction() {
    return {
      name: 'parseFilters',
      description: 'Parse natural language text into structured filter criteria',
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'Location filter like "nearby", "within 5km", or area name'
              },
              priceRange: {
                type: 'object',
                properties: {
                  min: { type: 'number', description: 'Minimum price in rupees' },
                  max: { type: 'number', description: 'Maximum price in rupees' }
                }
              },
              deliveryTime: {
                type: 'string',
                enum: ['same_day', 'next_day', 'express', 'standard', 'scheduled'],
                description: 'Delivery time preference'
              },
              quality: {
                type: 'string',
                enum: ['premium', 'organic', 'fresh', 'grade_a'],
                description: 'Quality preference'
              },
              categories: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['vegetables', 'fruits', 'spices', 'grains', 'pulses', 'dairy']
                },
                description: 'Product categories'
              },
              fssaiRequired: {
                type: 'boolean',
                description: 'Whether FSSAI certification is required'
              }
            }
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence score for the parsing (0-1)'
          },
          explanation: {
            type: 'string',
            description: 'Brief explanation of what filters were extracted'
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional suggestions for additional filters'
          }
        },
        required: ['filters', 'confidence', 'explanation']
      }
    };
  }

  private async callOpenRouter(payload: any): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Street Food Vendor Platform'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private parseOpenRouterResponse(
    response: OpenRouterResponse,
    originalText: string
  ): FilterParsingResponse {
    const choice = response.choices[0];
    
    if (choice?.message?.function_call?.name === 'parseFilters') {
      try {
        const args = JSON.parse(choice.message.function_call.arguments);
        return {
          filters: args.filters || {},
          confidence: args.confidence || 0.5,
          explanation: args.explanation || 'Parsed filter criteria from voice input',
          suggestions: args.suggestions || []
        };
      } catch (error) {
        console.error('Error parsing function call arguments:', error);
      }
    }

    // Fallback to content parsing if function call failed
    const content = choice?.message?.content || '';
    return this.fallbackParsing(content, originalText);
  }

  private fallbackParsing(content: string, originalText: string): FilterParsingResponse {
    // Simple fallback parsing logic
    const filters: any = {};
    const lowerText = originalText.toLowerCase();

    // Basic pattern matching as fallback
    if (lowerText.includes('fssai') || lowerText.includes('certified')) {
      filters.fssaiRequired = true;
    }

    if (lowerText.includes('nearby') || lowerText.includes('near')) {
      filters.location = 'nearby';
    }

    const kmMatch = lowerText.match(/(\d+)\s*km/);
    if (kmMatch) {
      filters.location = `within ${kmMatch[1]}km`;
    }

    if (lowerText.includes('premium') || lowerText.includes('high quality')) {
      filters.quality = 'premium';
    }

    if (lowerText.includes('same day') || lowerText.includes('today')) {
      filters.deliveryTime = 'same_day';
    }

    return {
      filters,
      confidence: 0.6,
      explanation: 'Parsed using fallback method due to API limitations',
      suggestions: []
    };
  }

  /**
   * Validate API key and connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.callOpenRouter({
        model: this.model,
        messages: [
          { role: 'user', content: 'Test connection' }
        ],
        max_tokens: 10
      });
      
      return response.choices && response.choices.length > 0;
    } catch (error) {
      console.error('OpenRouter connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): { totalRequests: number; totalTokens: number } {
    // In a real implementation, this would track usage
    return {
      totalRequests: 0,
      totalTokens: 0
    };
  }
}

export const openRouterFilterService = new OpenRouterFilterService();