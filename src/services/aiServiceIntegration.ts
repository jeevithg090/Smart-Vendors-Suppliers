/**
 * AI Service Integration Layer
 * Manages all AI service integrations for enhanced voice processing
 */

import { VOICE_QUERY_CONFIG, ERROR_MESSAGES } from '../config/voiceQuery';

export interface AIServiceConfig {
  sarvamApiKey: string;
  openRouterApiKey: string;
  googleTranslateApiKey?: string;
  visionApiKey?: string;
  clarifaiApiKey?: string;
  azureVisionApiKey?: string;
  azureVisionEndpoint?: string;
  ttsApiKey?: string;
}

export interface SpeechToTextResult {
  transcript: string;
  language: string;
  confidence: number;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface AIResponseResult {
  response: string;
  confidence: number;
  processingTime: number;
  model: string;
}

export interface VisionAnalysisResult {
  objects: Array<{
    name: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  labels: Array<{
    description: string;
    score: number;
  }>;
  text?: string;
  confidence: number;
}

/**
 * AI Service Integration Manager
 */
export class AIServiceIntegration {
  private config: AIServiceConfig;

  constructor() {
    this.config = {
      sarvamApiKey: import.meta.env.VITE_SARVAM_API_KEY || '',
      openRouterApiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
      googleTranslateApiKey: import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY,
      visionApiKey: import.meta.env.VITE_VISION_API_KEY,
      clarifaiApiKey: import.meta.env.VITE_CLARIFAI_API_KEY,
      azureVisionApiKey: import.meta.env.VITE_AZURE_VISION_API_KEY,
      azureVisionEndpoint: import.meta.env.VITE_AZURE_VISION_ENDPOINT,
      ttsApiKey: import.meta.env.VITE_TTS_API_KEY
    };
  }

  /**
   * Convert speech to text using Sarvam AI
   */
  async speechToText(audioBlob: Blob, language?: string): Promise<SpeechToTextResult> {
    if (!this.config.sarvamApiKey) {
      throw new Error(ERROR_MESSAGES.SARVAM_API_ERROR);
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      if (language) {
        formData.append('language', language);
      }

      const timeoutSignal = this.getTimeoutSignal(VOICE_QUERY_CONFIG.API_TIMEOUT);
      const response = await fetch(`${VOICE_QUERY_CONFIG.AI_SERVICES.sarvam.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.sarvamApiKey}`,
        },
        body: formData,
        ...(timeoutSignal ? { signal: timeoutSignal } : {})
      });

      if (!response.ok) {
        throw new Error(`Sarvam API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        transcript: result.transcript || '',
        language: result.language || language || 'en',
        confidence: result.confidence || 0.8,
        alternatives: result.alternatives || []
      };
    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw new Error(ERROR_MESSAGES.SARVAM_API_ERROR);
    }
  }

  /**
   * Translate text using Google Translate or OpenRouter fallback
   */
  async translateText(
    text: string, 
    sourceLanguage: string, 
    targetLanguage: string
  ): Promise<TranslationResult> {
    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        confidence: 1.0
      };
    }

    try {
      // Try Google Translate first if configured; fallback to OpenRouter on failure.
      if (this.config.googleTranslateApiKey) {
        try {
          return await this.googleTranslate(text, sourceLanguage, targetLanguage);
        } catch (googleError) {
          console.warn('Google Translate failed, falling back to OpenRouter:', googleError);
          return await this.openRouterTranslate(text, sourceLanguage, targetLanguage);
        }
      }

      return await this.openRouterTranslate(text, sourceLanguage, targetLanguage);
    } catch (error) {
      console.error('Translation error:', error);
      // Return original text if translation fails
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        confidence: 0.5
      };
    }
  }

  /**
   * Generate AI response using OpenRouter
   */
  async generateAIResponse(
    prompt: string,
    context?: any,
    systemPrompt?: string
  ): Promise<AIResponseResult> {
    if (!this.config.openRouterApiKey) {
      throw new Error(ERROR_MESSAGES.OPENROUTER_API_ERROR);
    }

    const startTime = Date.now();

    try {
      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt || 'You are a helpful AI assistant for a food vendor sourcing platform.'
        },
        {
          role: 'user' as const,
          content: context ? `Context: ${JSON.stringify(context)}\n\nQuery: ${prompt}` : prompt
        }
      ];

      const timeoutSignal = this.getTimeoutSignal(VOICE_QUERY_CONFIG.API_TIMEOUT);
      const response = await fetch(`${VOICE_QUERY_CONFIG.AI_SERVICES.openRouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: VOICE_QUERY_CONFIG.AI_SERVICES.openRouter.model,
          messages,
          temperature: VOICE_QUERY_CONFIG.AI_SERVICES.openRouter.temperature,
          max_tokens: VOICE_QUERY_CONFIG.AI_SERVICES.openRouter.maxTokens
        }),
        ...(timeoutSignal ? { signal: timeoutSignal } : {})
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const result = await response.json();
      const processingTime = Math.max(1, Date.now() - startTime);

      return {
        response: result.choices[0].message.content,
        confidence: 0.9,
        processingTime,
        model: VOICE_QUERY_CONFIG.AI_SERVICES.openRouter.model
      };
    } catch (error) {
      console.error('AI response generation error:', error);
      throw new Error(ERROR_MESSAGES.OPENROUTER_API_ERROR);
    }
  }

  /**
   * Analyze image using computer vision services
   */
  async analyzeImage(imageBase64: string, provider?: 'google' | 'clarifai' | 'azure'): Promise<VisionAnalysisResult> {
    const selectedProvider = provider || this.getAvailableVisionProvider();
    
    if (!selectedProvider) {
      throw new Error(ERROR_MESSAGES.VISION_API_ERROR);
    }

    try {
      switch (selectedProvider) {
        case 'google':
          return await this.googleVisionAnalysis(imageBase64);
        case 'clarifai':
          return await this.clarifaiAnalysis(imageBase64);
        case 'azure':
          return await this.azureVisionAnalysis(imageBase64);
        default:
          throw new Error('No vision provider available');
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error(ERROR_MESSAGES.VISION_API_ERROR);
    }
  }

  /**
   * Convert text to speech (placeholder for TTS integration)
   */
  async textToSpeech(text: string, language: string = 'en'): Promise<Blob> {
    // This is a placeholder implementation
    // In production, integrate with a TTS service like Google TTS, Azure Speech, or ElevenLabs
    
    if (!this.config.ttsApiKey) {
      throw new Error('TTS service not configured');
    }

    // For now, return empty blob - implement actual TTS integration as needed
    return new Blob([''], { type: 'audio/wav' });
  }

  /**
   * Private helper methods
   */
  private async googleTranslate(
    text: string, 
    sourceLanguage: string, 
    targetLanguage: string
  ): Promise<TranslationResult> {
    const timeoutSignal = this.getTimeoutSignal(VOICE_QUERY_CONFIG.API_TIMEOUT);
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${this.config.googleTranslateApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text'
        }),
        ...(timeoutSignal ? { signal: timeoutSignal } : {})
      }
    );

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const result = await response.json();
    const translatedText =
      result?.data?.translations?.[0]?.translatedText ||
      result?.choices?.[0]?.message?.content ||
      result?.translatedText;

    if (!translatedText || typeof translatedText !== 'string') {
      throw new Error('Google Translate response was missing translated text');
    }
    
    return {
      translatedText,
      sourceLanguage,
      targetLanguage,
      confidence: 0.95
    };
  }

  private async openRouterTranslate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    const response = await this.generateAIResponse(
      text,
      null,
      `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Return only the translation, no explanations.`
    );

    return {
      translatedText: response.response,
      sourceLanguage,
      targetLanguage,
      confidence: 0.8
    };
  }

  private getTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
    try {
      // Avoid cross-realm AbortSignal issues in jsdom/vitest.
      if (typeof process !== 'undefined' && (process as any).env?.VITEST) {
        return undefined;
      }
      if (typeof window !== 'undefined' && (window as any).AbortSignal && (window as any).AbortSignal !== AbortSignal) {
        return undefined;
      }

      const timeout = (AbortSignal as any)?.timeout;
      if (typeof timeout === 'function') {
        return timeout(timeoutMs);
      }
    } catch {
      // Ignore environments where AbortSignal.timeout is unavailable/incompatible.
    }
    return undefined;
  }

  private async googleVisionAnalysis(imageBase64: string): Promise<VisionAnalysisResult> {
    if (!this.config.visionApiKey) {
      throw new Error('Google Vision API key not configured');
    }

    const timeoutSignal = this.getTimeoutSignal(VOICE_QUERY_CONFIG.IMAGE_ANALYSIS.maxProcessingTime);
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.config.visionApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'TEXT_DETECTION', maxResults: 5 }
            ]
          }]
        }),
        ...(timeoutSignal ? { signal: timeoutSignal } : {})
      }
    );

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.statusText}`);
    }

    const result = await response.json();
    const annotations = result.responses[0];

    return this.parseGoogleVisionResult(annotations);
  }

  private async clarifaiAnalysis(imageBase64: string): Promise<VisionAnalysisResult> {
    if (!this.config.clarifaiApiKey) {
      throw new Error('Clarifai API key not configured');
    }

    const timeoutSignal = this.getTimeoutSignal(VOICE_QUERY_CONFIG.IMAGE_ANALYSIS.maxProcessingTime);
    const response = await fetch('https://api.clarifai.com/v2/models/food-item-recognition/outputs', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.config.clarifaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [{
          data: {
            image: {
              base64: imageBase64
            }
          }
        }]
      }),
      ...(timeoutSignal ? { signal: timeoutSignal } : {})
    });

    if (!response.ok) {
      throw new Error(`Clarifai API error: ${response.statusText}`);
    }

    const result = await response.json();
    const concepts = result.outputs[0]?.data?.concepts || [];

    return this.parseClarifaiResult(concepts);
  }

  private async azureVisionAnalysis(imageBase64: string): Promise<VisionAnalysisResult> {
    if (!this.config.azureVisionApiKey || !this.config.azureVisionEndpoint) {
      throw new Error('Azure Vision API credentials not configured');
    }

    const timeoutSignal = this.getTimeoutSignal(VOICE_QUERY_CONFIG.IMAGE_ANALYSIS.maxProcessingTime);
    const response = await fetch(
      `${this.config.azureVisionEndpoint}/vision/v3.2/analyze?visualFeatures=Objects,Tags,Description`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.azureVisionApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `data:image/jpeg;base64,${imageBase64}`
        }),
        ...(timeoutSignal ? { signal: timeoutSignal } : {})
      }
    );

    if (!response.ok) {
      throw new Error(`Azure Vision API error: ${response.statusText}`);
    }

    const result = await response.json();
    return this.parseAzureVisionResult(result);
  }

  private parseGoogleVisionResult(annotations: any): VisionAnalysisResult {
    const objects = (annotations.localizedObjectAnnotations || []).map((obj: any) => ({
      name: obj.name.toLowerCase(),
      confidence: obj.score,
      boundingBox: obj.boundingPoly ? this.parseBoundingBox(obj.boundingPoly) : undefined
    }));

    const labels = (annotations.labelAnnotations || []).map((label: any) => ({
      description: label.description.toLowerCase(),
      score: label.score
    }));

    const text = annotations.textAnnotations?.[0]?.description || '';
    const confidence = this.calculateOverallConfidence(objects, labels);

    return { objects, labels, text, confidence };
  }

  private parseClarifaiResult(concepts: any[]): VisionAnalysisResult {
    const objects = concepts
      .filter((concept: any) => concept.value > VOICE_QUERY_CONFIG.IMAGE_ANALYSIS.confidenceThreshold)
      .map((concept: any) => ({
        name: concept.name.toLowerCase(),
        confidence: concept.value
      }));

    const labels = concepts.map((concept: any) => ({
      description: concept.name.toLowerCase(),
      score: concept.value
    }));

    const confidence = concepts.length > 0 
      ? concepts.reduce((sum: number, concept: any) => sum + concept.value, 0) / concepts.length 
      : 0;

    return { objects, labels, confidence };
  }

  private parseAzureVisionResult(result: any): VisionAnalysisResult {
    const objects = (result.objects || []).map((obj: any) => ({
      name: obj.object.toLowerCase(),
      confidence: obj.confidence,
      boundingBox: {
        x: obj.rectangle.x,
        y: obj.rectangle.y,
        width: obj.rectangle.w,
        height: obj.rectangle.h
      }
    }));

    const labels = (result.tags || []).map((tag: any) => ({
      description: tag.name.toLowerCase(),
      score: tag.confidence
    }));

    const confidence = this.calculateOverallConfidence(objects, labels);

    return { objects, labels, confidence };
  }

  private parseBoundingBox(boundingPoly: any): { x: number; y: number; width: number; height: number } {
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

  private calculateOverallConfidence(objects: any[], labels: any[]): number {
    if (objects.length === 0 && labels.length === 0) return 0;
    
    const objectConfidence = objects.length > 0 
      ? objects.reduce((sum, obj) => sum + obj.confidence, 0) / objects.length 
      : 0;
    
    const labelConfidence = labels.length > 0
      ? labels.reduce((sum, label) => sum + label.score, 0) / labels.length
      : 0;

    return (objectConfidence + labelConfidence) / 2;
  }

  private getAvailableVisionProvider(): 'google' | 'clarifai' | 'azure' | null {
    if (this.config.visionApiKey) return 'google';
    if (this.config.clarifaiApiKey) return 'clarifai';
    if (this.config.azureVisionApiKey && this.config.azureVisionEndpoint) return 'azure';
    return null;
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    sarvam: boolean;
    openRouter: boolean;
    googleTranslate: boolean;
    vision: boolean;
    tts: boolean;
  }> {
    return {
      sarvam: !!this.config.sarvamApiKey,
      openRouter: !!this.config.openRouterApiKey,
      googleTranslate: !!this.config.googleTranslateApiKey,
      vision: !!this.getAvailableVisionProvider(),
      tts: !!this.config.ttsApiKey
    };
  }

  /**
   * Get service configuration status
   */
  getServiceStatus() {
    return {
      sarvamConfigured: !!this.config.sarvamApiKey,
      openRouterConfigured: !!this.config.openRouterApiKey,
      translationConfigured: !!(this.config.googleTranslateApiKey || this.config.openRouterApiKey),
      visionConfigured: !!this.getAvailableVisionProvider(),
      ttsConfigured: !!this.config.ttsApiKey,
      availableVisionProvider: this.getAvailableVisionProvider()
    };
  }
}

// Export singleton instance
export const aiServiceIntegration = new AIServiceIntegration();
