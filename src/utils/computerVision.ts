/**
 * Computer Vision Integration Utilities
 * Supports multiple providers: Google Vision, Clarifai, Azure Computer Vision
 */

import { VOICE_QUERY_CONFIG, FOOD_CATEGORIES, INGREDIENT_ALTERNATIVES } from '../config/voiceQuery';

export interface VisionProvider {
  name: string;
  analyzeImage(imageData: string): Promise<VisionResult>;
}

export interface VisionResult {
  objects: DetectedObject[];
  labels: Label[];
  text?: string;
  confidence: number;
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox?: BoundingBox;
  category?: string;
}

export interface Label {
  description: string;
  score: number;
  category?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FoodAnalysisResult {
  identifiedItems: FoodItem[];
  ingredients: Ingredient[];
  confidence: number;
  categories: string[];
  alternatives: string[];
}

export interface FoodItem {
  name: string;
  confidence: number;
  category: string;
  alternatives: string[];
  boundingBox?: BoundingBox;
}

export interface Ingredient {
  name: string;
  confidence: number;
  category: string;
  alternatives: string[];
  quantity?: string;
  unit?: string;
}

/**
 * Google Vision API Provider
 */
export class GoogleVisionProvider implements VisionProvider {
  name = 'google';
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_VISION_API_KEY || '';
  }

  async analyzeImage(imageData: string): Promise<VisionResult> {
    if (!this.apiKey) {
      throw new Error('Google Vision API key not configured');
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: imageData },
            features: [
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'TEXT_DETECTION', maxResults: 5 }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.statusText}`);
    }

    const result = await response.json();
    const annotations = result.responses[0];

    return {
      objects: this.parseObjects(annotations.localizedObjectAnnotations || []),
      labels: this.parseLabels(annotations.labelAnnotations || []),
      text: annotations.textAnnotations?.[0]?.description || '',
      confidence: this.calculateOverallConfidence(annotations)
    };
  }

  private parseObjects(objects: any[]): DetectedObject[] {
    return objects.map(obj => ({
      name: obj.name.toLowerCase(),
      confidence: obj.score,
      boundingBox: obj.boundingPoly ? this.parseBoundingBox(obj.boundingPoly) : undefined,
      category: this.categorizeObject(obj.name)
    }));
  }

  private parseLabels(labels: any[]): Label[] {
    return labels.map(label => ({
      description: label.description.toLowerCase(),
      score: label.score,
      category: this.categorizeLabel(label.description)
    }));
  }

  private parseBoundingBox(boundingPoly: any): BoundingBox {
    const vertices = boundingPoly.normalizedVertices || boundingPoly.vertices;
    if (!vertices || vertices.length < 2) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const minX = Math.min(...vertices.map((v: any) => v.x || 0));
    const minY = Math.min(...vertices.map((v: any) => v.y || 0));
    const maxX = Math.max(...vertices.map((v: any) => v.x || 0));
    const maxY = Math.max(...vertices.map((v: any) => v.y || 0));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private categorizeObject(name: string): string {
    const lowerName = name.toLowerCase();
    for (const [category, items] of Object.entries(FOOD_CATEGORIES)) {
      if (items.some(item => lowerName.includes(item) || item.includes(lowerName))) {
        return category.toLowerCase();
      }
    }
    return 'general';
  }

  private categorizeLabel(description: string): string {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('vegetable') || lowerDesc.includes('produce')) return 'vegetables';
    if (lowerDesc.includes('fruit')) return 'fruits';
    if (lowerDesc.includes('grain') || lowerDesc.includes('cereal')) return 'grains';
    if (lowerDesc.includes('spice') || lowerDesc.includes('seasoning')) return 'spices';
    if (lowerDesc.includes('dairy')) return 'dairy';
    return 'general';
  }

  private calculateOverallConfidence(annotations: any): number {
    const objects = annotations.localizedObjectAnnotations || [];
    const labels = annotations.labelAnnotations || [];
    
    if (objects.length === 0 && labels.length === 0) return 0;
    
    const objectConfidence = objects.length > 0 
      ? objects.reduce((sum: number, obj: any) => sum + obj.score, 0) / objects.length 
      : 0;
    
    const labelConfidence = labels.length > 0
      ? labels.reduce((sum: number, label: any) => sum + label.score, 0) / labels.length
      : 0;

    return (objectConfidence + labelConfidence) / 2;
  }
}

/**
 * Clarifai API Provider
 */
export class ClarifaiProvider implements VisionProvider {
  name = 'clarifai';
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_CLARIFAI_API_KEY || '';
  }

  async analyzeImage(imageData: string): Promise<VisionResult> {
    if (!this.apiKey) {
      throw new Error('Clarifai API key not configured');
    }

    const response = await fetch('https://api.clarifai.com/v2/models/food-item-recognition/outputs', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [{
          data: {
            image: {
              base64: imageData
            }
          }
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Clarifai API error: ${response.statusText}`);
    }

    const result = await response.json();
    const concepts = result.outputs[0]?.data?.concepts || [];

    return {
      objects: this.parseConceptsAsObjects(concepts),
      labels: this.parseConceptsAsLabels(concepts),
      confidence: this.calculateConfidence(concepts)
    };
  }

  private parseConceptsAsObjects(concepts: any[]): DetectedObject[] {
    return concepts
      .filter((concept: any) => concept.value > VOICE_QUERY_CONFIG.IMAGE_ANALYSIS.confidenceThreshold)
      .map((concept: any) => ({
        name: concept.name.toLowerCase(),
        confidence: concept.value,
        category: this.categorizeObject(concept.name)
      }));
  }

  private parseConceptsAsLabels(concepts: any[]): Label[] {
    return concepts.map((concept: any) => ({
      description: concept.name.toLowerCase(),
      score: concept.value,
      category: this.categorizeLabel(concept.name)
    }));
  }

  private categorizeObject(name: string): string {
    const lowerName = name.toLowerCase();
    for (const [category, items] of Object.entries(FOOD_CATEGORIES)) {
      if (items.some(item => lowerName.includes(item) || item.includes(lowerName))) {
        return category.toLowerCase();
      }
    }
    return 'general';
  }

  private categorizeLabel(description: string): string {
    return this.categorizeObject(description);
  }

  private calculateConfidence(concepts: any[]): number {
    if (concepts.length === 0) return 0;
    return concepts.reduce((sum: number, concept: any) => sum + concept.value, 0) / concepts.length;
  }
}

/**
 * Computer Vision Manager
 * Manages multiple vision providers and food analysis
 */
export class ComputerVisionManager {
  private providers: Map<string, VisionProvider> = new Map();
  private defaultProvider: string;

  constructor() {
    // Initialize available providers
    if (import.meta.env.VITE_VISION_API_KEY) {
      this.providers.set('google', new GoogleVisionProvider());
    }
    if (import.meta.env.VITE_CLARIFAI_API_KEY) {
      this.providers.set('clarifai', new ClarifaiProvider());
    }

    this.defaultProvider = VOICE_QUERY_CONFIG.IMAGE_ANALYSIS.providers.google ? 'google' : 'clarifai';
  }

  /**
   * Analyze food image and extract ingredients
   */
  async analyzeFoodImage(
    imageFile: File, 
    provider?: string
  ): Promise<FoodAnalysisResult> {
    try {
      // Validate image
      this.validateImage(imageFile);

      // Convert to base64
      const base64Image = await this.fileToBase64(imageFile);

      // Get vision provider
      const visionProvider = this.getProvider(provider);

      // Analyze image
      const visionResult = await visionProvider.analyzeImage(base64Image);

      // Extract food items and ingredients
      const foodAnalysis = this.extractFoodAnalysis(visionResult);

      return foodAnalysis;
    } catch (error) {
      console.error('Food image analysis error:', error);
      throw error;
    }
  }

  /**
   * Validate image file
   */
  private validateImage(file: File): void {
    const config = VOICE_QUERY_CONFIG.IMAGE_ANALYSIS;

    if (file.size > config.maxImageSize) {
      throw new Error(`Image too large. Maximum size is ${config.maxImageSize / (1024 * 1024)}MB`);
    }

    if (!config.supportedFormats.includes(file.type)) {
      throw new Error(`Unsupported image format. Supported formats: ${config.supportedFormats.join(', ')}`);
    }
  }

  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get vision provider
   */
  private getProvider(providerName?: string): VisionProvider {
    const name = providerName || this.defaultProvider;
    const provider = this.providers.get(name);

    if (!provider) {
      throw new Error(`Vision provider '${name}' not available`);
    }

    return provider;
  }

  /**
   * Extract food analysis from vision results
   */
  private extractFoodAnalysis(visionResult: VisionResult): FoodAnalysisResult {
    const identifiedItems: FoodItem[] = [];
    const ingredients: Ingredient[] = [];
    const categories: Set<string> = new Set();
    const alternatives: Set<string> = new Set();

    // Process detected objects
    visionResult.objects.forEach(obj => {
      if (this.isFoodItem(obj.name)) {
        const foodItem: FoodItem = {
          name: obj.name,
          confidence: obj.confidence,
          category: obj.category || 'general',
          alternatives: this.getAlternatives(obj.name),
          boundingBox: obj.boundingBox
        };

        identifiedItems.push(foodItem);
        categories.add(foodItem.category);

        // Add as ingredient if it's a simple ingredient
        if (this.isSimpleIngredient(obj.name)) {
          ingredients.push({
            name: obj.name,
            confidence: obj.confidence,
            category: foodItem.category,
            alternatives: foodItem.alternatives
          });
        }

        // Add alternatives
        foodItem.alternatives.forEach(alt => alternatives.add(alt));
      }
    });

    // Process labels for additional context
    visionResult.labels.forEach(label => {
      if (this.isFoodCategory(label.description)) {
        categories.add(label.category || 'general');
      }
    });

    // Extract complex ingredients from identified items
    const complexIngredients = this.extractComplexIngredients(identifiedItems);
    ingredients.push(...complexIngredients);

    return {
      identifiedItems,
      ingredients,
      confidence: visionResult.confidence,
      categories: Array.from(categories),
      alternatives: Array.from(alternatives)
    };
  }

  /**
   * Check if detected object is a food item
   */
  private isFoodItem(name: string): boolean {
    const lowerName = name.toLowerCase();
    
    // Check against known food categories
    for (const items of Object.values(FOOD_CATEGORIES)) {
      if (items.some(item => 
        lowerName.includes(item) || 
        item.includes(lowerName) ||
        this.getAlternatives(item).some(alt => 
          lowerName.includes(alt.toLowerCase()) || 
          alt.toLowerCase().includes(lowerName)
        )
      )) {
        return true;
      }
    }

    // Check common food keywords
    const foodKeywords = ['food', 'ingredient', 'vegetable', 'fruit', 'spice', 'grain', 'dairy'];
    return foodKeywords.some(keyword => lowerName.includes(keyword));
  }

  /**
   * Check if label describes a food category
   */
  private isFoodCategory(description: string): boolean {
    const foodCategories = ['vegetable', 'fruit', 'grain', 'spice', 'food', 'ingredient', 'produce', 'dairy'];
    return foodCategories.some(category => description.toLowerCase().includes(category));
  }

  /**
   * Check if item is a simple ingredient
   */
  private isSimpleIngredient(name: string): boolean {
    const simpleIngredients = [
      ...FOOD_CATEGORIES.VEGETABLES,
      ...FOOD_CATEGORIES.FRUITS,
      ...FOOD_CATEGORIES.GRAINS,
      ...FOOD_CATEGORIES.SPICES,
      ...FOOD_CATEGORIES.PULSES
    ];
    
    return simpleIngredients.some(ingredient => 
      name.toLowerCase().includes(ingredient) || 
      ingredient.includes(name.toLowerCase())
    );
  }

  /**
   * Get alternative names for an ingredient
   */
  private getAlternatives(name: string): string[] {
    const lowerName = name.toLowerCase();
    
    // Check predefined alternatives
    for (const [key, alternatives] of Object.entries(INGREDIENT_ALTERNATIVES)) {
      if (lowerName.includes(key) || key.includes(lowerName)) {
        return alternatives;
      }
    }

    return [];
  }

  /**
   * Extract ingredients from complex food items
   */
  private extractComplexIngredients(items: FoodItem[]): Ingredient[] {
    const complexIngredients: Ingredient[] = [];

    items.forEach(item => {
      if (!this.isSimpleIngredient(item.name)) {
        // For complex items, try to extract constituent ingredients
        const extractedIngredients = this.getComplexIngredients(item.name);
        
        extractedIngredients.forEach(ingredientName => {
          complexIngredients.push({
            name: ingredientName,
            confidence: item.confidence * 0.8, // Reduce confidence for extracted ingredients
            category: this.categorizeIngredient(ingredientName),
            alternatives: this.getAlternatives(ingredientName)
          });
        });
      }
    });

    return complexIngredients;
  }

  /**
   * Get ingredients for complex food items
   */
  private getComplexIngredients(itemName: string): string[] {
    const complexFoodMap: Record<string, string[]> = {
      'curry': ['onion', 'tomato', 'spices', 'oil'],
      'salad': ['vegetables', 'dressing'],
      'soup': ['vegetables', 'broth', 'spices'],
      'sandwich': ['bread', 'vegetables', 'condiments'],
      'pizza': ['flour', 'tomato', 'cheese', 'vegetables'],
      'pasta': ['flour', 'tomato', 'herbs', 'cheese'],
      'biryani': ['rice', 'meat', 'spices', 'onion'],
      'dal': ['lentils', 'spices', 'onion', 'tomato']
    };

    const lowerName = itemName.toLowerCase();
    for (const [dish, ingredients] of Object.entries(complexFoodMap)) {
      if (lowerName.includes(dish)) {
        return ingredients;
      }
    }

    return [itemName]; // Return the item itself if no mapping found
  }

  /**
   * Categorize ingredient
   */
  private categorizeIngredient(name: string): string {
    const lowerName = name.toLowerCase();
    
    for (const [category, items] of Object.entries(FOOD_CATEGORIES)) {
      if (items.some(item => lowerName.includes(item) || item.includes(lowerName))) {
        return category.toLowerCase();
      }
    }

    return 'general';
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if any provider is available
   */
  isAvailable(): boolean {
    return this.providers.size > 0;
  }
}

// Export singleton instance
export const computerVisionManager = new ComputerVisionManager();