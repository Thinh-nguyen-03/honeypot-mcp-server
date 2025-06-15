import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock all dependencies BEFORE importing anything else
vi.mock('lithic', () => {
  const MockLithic = vi.fn().mockImplementation(() => ({
    cards: {
      create: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn(),
      update: vi.fn()
    },
    transactions: {
      retrieve: vi.fn(),
      list: vi.fn()
    }
  }));
  
  return {
    default: MockLithic,
    Lithic: MockLithic
  };
});

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }))
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  }))
}));

vi.mock('../../../src/services/reporting-service.js');
vi.mock('../../../src/services/mcc-service.js');
vi.mock('../../../src/utils/logger.js');

// Now import the modules
import * as patternHandlers from '../../../src/handlers/pattern-analysis-handlers.js';
import * as reportingService from '../../../src/services/reporting-service.js';
import * as mccService from '../../../src/services/mcc-service.js';
import logger from '../../../src/utils/logger.js';

describe('Pattern Analysis Handlers - MCP Tool Implementation', () => {
  let mockRequestId;
  
  beforeEach(() => {
    mockRequestId = 'mcp_test_123456789';
    vi.clearAllMocks();
    
    // Mock logger methods
    logger.info = vi.fn();
    logger.error = vi.fn();
    logger.warn = vi.fn();
    logger.debug = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Security Tests', () => {
    test('should sanitize card tokens in pattern analysis logs', async () => {
      const argsWithSensitiveData = {
        cardToken: 'card_abc123def456789012',
        analysisWindow: '30d',
        patternTypes: ['temporal', 'merchant']
      };

      reportingService.analyzePatterns = vi.fn().mockResolvedValue({
        patterns: [{ type: 'temporal', score: 0.8 }],
        anomalies: [],
        confidence: 0.85,
        riskScore: 0.7
      });

      await patternHandlers.handleAnalyzeTransactionPatterns(argsWithSensitiveData, mockRequestId);

      // Verify that card tokens are masked in logs
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.args && loggedArgs.args.cardToken) {
          expect(loggedArgs.args.cardToken).toBe('card_abc***');
        }
        if (loggedArgs.cardToken) {
          expect(loggedArgs.cardToken).toBe('card_abc***');
        }
      });
    });

    test('should sanitize transaction tokens in fraud detection', async () => {
      const argsWithSensitiveData = {
        transactionToken: 'txn_sensitive123456789',
        analysisDepth: 'comprehensive',
        riskThreshold: 0.8
      };

      reportingService.detectFraud = vi.fn().mockResolvedValue({
        riskScore: 0.9,
        riskLevel: 'HIGH',
        indicators: ['velocity_spike', 'unusual_merchant'],
        confidence: 0.95,
        recommendations: ['block_transaction']
      });

      await patternHandlers.handleDetectFraudIndicators(argsWithSensitiveData, mockRequestId);

      // Verify transaction token is masked in logs
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.entityToken) {
          expect(loggedArgs.entityToken).toBe('txn_sens***');
        }
      });
    });

    test('should sanitize entity IDs in risk assessment', async () => {
      const argsWithSensitiveData = {
        entityType: 'card',
        entityId: 'card_sensitive_id_12345',
        assessmentType: 'fraud'
      };

      reportingService.assessRisk = vi.fn().mockResolvedValue({
        riskScore: 0.6,
        riskLevel: 'MEDIUM',
        confidence: 0.8,
        riskFactors: [{ factor: 'velocity', score: 0.7 }],
        analysis: { summary: 'Medium risk profile' }
      });

      await patternHandlers.handlePerformRiskAssessment(argsWithSensitiveData, mockRequestId);

      // Verify entity ID is masked in logs
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.entityId) {
          expect(loggedArgs.entityId).toBe('card_sen***');
        }
      });
    });
  });

  describe('Input Validation Tests', () => {
    test('handleAnalyzeTransactionPatterns - validates required cardToken', async () => {
      const argsWithoutCard = {
        analysisWindow: '30d',
        patternTypes: ['temporal']
      };

      await expect(
        patternHandlers.handleAnalyzeTransactionPatterns(argsWithoutCard, mockRequestId)
      ).rejects.toThrow(/cardToken.*required/i);
    });

    test('handleDetectFraudIndicators - validates required token or card', async () => {
      const argsWithoutIdentifier = {
        analysisDepth: 'standard',
        riskThreshold: 0.8
      };

      await expect(
        patternHandlers.handleDetectFraudIndicators(argsWithoutIdentifier, mockRequestId)
      ).rejects.toThrow(/Either transactionToken or cardToken is required/i);
    });

    test('handleGenerateMerchantIntelligence - validates required merchant identifier', async () => {
      const argsWithoutMerchant = {
        analysisType: 'comprehensive',
        timeframe: '90d'
      };

      await expect(
        patternHandlers.handleGenerateMerchantIntelligence(argsWithoutMerchant, mockRequestId)
      ).rejects.toThrow(/Either merchantDescriptor or merchantId is required/i);
    });

    test('handlePerformRiskAssessment - validates required entity parameters', async () => {
      const argsWithoutEntity = {
        assessmentType: 'fraud'
      };

      await expect(
        patternHandlers.handlePerformRiskAssessment(argsWithoutEntity, mockRequestId)
      ).rejects.toThrow(/entityType and entityId are required/i);
    });
  });

  describe('Business Logic Tests', () => {
    test('handleAnalyzeTransactionPatterns - preserves service function behavior', async () => {
      const args = {
        cardToken: 'card_12345',
        analysisWindow: '60d',
        patternTypes: ['temporal', 'merchant', 'amount'],
        includeAnomalies: true,
        confidenceThreshold: 0.8
      };

      const mockAnalysis = {
        patterns: [
          { type: 'temporal', score: 0.85, description: 'Regular spending pattern' },
          { type: 'merchant', score: 0.7, description: 'Diverse merchant usage' }
        ],
        anomalies: [{ type: 'amount_spike', severity: 'medium' }],
        confidence: 0.9,
        summary: 'Normal usage pattern with minor anomaly',
        riskScore: 0.3
      };

      reportingService.analyzePatterns = vi.fn().mockResolvedValue(mockAnalysis);

      const result = await patternHandlers.handleAnalyzeTransactionPatterns(args, mockRequestId);

      // Verify service called correctly
      expect(reportingService.analyzePatterns).toHaveBeenCalledWith(
        expect.objectContaining({
          cardToken: 'card_12345',
          analysisWindow: '60d',
          patternTypes: ['temporal', 'merchant', 'amount'],
          includeAnomalies: true,
          confidenceThreshold: 0.8
        }),
        mockRequestId
      );

      // Verify response structure
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.patternAnalysis.patterns).toEqual(mockAnalysis.patterns);
      expect(parsedResponse.patternAnalysis.anomalies).toEqual(mockAnalysis.anomalies);
      expect(parsedResponse.patternAnalysis.riskScore).toBe(0.3);
    });

    test('handleDetectFraudIndicators - applies default values correctly', async () => {
      const args = {
        transactionToken: 'txn_12345'
        // No other parameters specified - should use defaults
      };

      const mockFraudResult = {
        riskScore: 0.85,
        riskLevel: 'HIGH',
        indicators: ['velocity_spike', 'new_merchant'],
        mlPredictions: { model1: 0.9, model2: 0.8 },
        recommendations: ['manual_review'],
        confidence: 0.92
      };

      reportingService.detectFraud = vi.fn().mockResolvedValue(mockFraudResult);

      const result = await patternHandlers.handleDetectFraudIndicators(args, mockRequestId);

      // Verify defaults applied
      expect(reportingService.detectFraud).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionToken: 'txn_12345',
          analysisDepth: 'standard',
          riskThreshold: 0.8,
          includeMLModels: true,
          historicalContext: '30d'
        }),
        mockRequestId
      );

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.fraudAnalysis.riskScore).toBe(0.85);
      expect(parsedResponse.fraudAnalysis.isFlagged).toBe(true); // 0.85 >= 0.8
      expect(parsedResponse.fraudAnalysis.mlPredictions).toEqual(mockFraudResult.mlPredictions);
    });

    test('handleGenerateMerchantIntelligence - formats comprehensive merchant data', async () => {
      const args = {
        merchantDescriptor: 'AMAZON.COM',
        analysisType: 'comprehensive',
        timeframe: '90d',
        includeIndustryData: true,
        includeRiskFactors: true,
        includeGeographic: true
      };

      const mockIntelResult = {
        merchantProfile: {
          name: 'Amazon.com',
          category: 'E-commerce',
          mcc: '5999'
        },
        riskProfile: {
          riskScore: 0.2,
          riskFactors: ['large_volume', 'established_merchant']
        },
        transactionPatterns: {
          averageAmount: 89.50,
          frequencyPattern: 'regular'
        },
        industryComparison: {
          percentile: 85,
          benchmarks: { risk: 'low', volume: 'high' }
        },
        geographicData: {
          primaryRegions: ['US', 'UK', 'CA'],
          globalPresence: true
        },
        reputation: {
          score: 0.95,
          sources: ['consumer_reports', 'business_rating']
        },
        recommendations: ['low_risk_merchant']
      };

      mccService.getMerchantIntel = vi.fn().mockResolvedValue(mockIntelResult);

      const result = await patternHandlers.handleGenerateMerchantIntelligence(args, mockRequestId);

      // Verify service called correctly
      expect(mccService.getMerchantIntel).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantDescriptor: 'AMAZON.COM',
          analysisType: 'comprehensive',
          timeframe: '90d',
          includeIndustryData: true,
          includeRiskFactors: true,
          includeGeographic: true
        }),
        mockRequestId
      );

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.merchantIntelligence.merchantProfile).toEqual(mockIntelResult.merchantProfile);
      expect(parsedResponse.merchantIntelligence.industryComparison).toEqual(mockIntelResult.industryComparison);
      expect(parsedResponse.merchantIntelligence.geographicData).toEqual(mockIntelResult.geographicData);
    });

    test('handlePerformRiskAssessment - handles different entity types', async () => {
      const args = {
        entityType: 'transaction',
        entityId: 'txn_risk_test',
        assessmentType: 'fraud',
        riskFactors: ['velocity', 'amount_deviation', 'merchant_risk'],
        includeRecommendations: true,
        includePredictions: true,
        confidenceLevel: 0.9
      };

      const mockRiskResult = {
        riskScore: 0.75,
        riskLevel: 'HIGH',
        confidence: 0.92,
        riskFactors: [
          { factor: 'velocity', score: 0.8, weight: 0.3 },
          { factor: 'amount_deviation', score: 0.7, weight: 0.4 }
        ],
        analysis: {
          summary: 'High risk due to velocity and amount patterns',
          details: 'Transaction shows unusual velocity compared to historical data'
        },
        recommendations: ['manual_review', 'additional_verification'],
        predictions: {
          nextRiskScore: 0.8,
          timeToNormalcy: '7d'
        },
        summary: 'High-risk transaction requiring immediate attention'
      };

      reportingService.assessRisk = vi.fn().mockResolvedValue(mockRiskResult);

      const result = await patternHandlers.handlePerformRiskAssessment(args, mockRequestId);

      // Verify service called correctly
      expect(reportingService.assessRisk).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'transaction',
          entityId: 'txn_risk_test',
          assessmentType: 'fraud',
          riskFactors: ['velocity', 'amount_deviation', 'merchant_risk'],
          includeRecommendations: true,
          includePredictions: true,
          confidenceLevel: 0.9
        }),
        mockRequestId
      );

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.riskAssessment.riskScore).toBe(0.75);
      expect(parsedResponse.riskAssessment.riskLevel).toBe('HIGH');
      expect(parsedResponse.riskAssessment.recommendations).toEqual(['manual_review', 'additional_verification']);
      expect(parsedResponse.riskAssessment.predictions).toEqual(mockRiskResult.predictions);
    });
  });

  describe('Error Handling Tests', () => {
    test('handles pattern analysis service errors gracefully', async () => {
      const args = { cardToken: 'card_error_test' };
      const serviceError = new Error('Pattern analysis failed');

      reportingService.analyzePatterns = vi.fn().mockRejectedValue(serviceError);

      await expect(
        patternHandlers.handleAnalyzeTransactionPatterns(args, mockRequestId)
      ).rejects.toThrow("Tool 'analyze_transaction_patterns' failed: Pattern analysis failed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          cardToken: 'card_err***',
          error: 'Pattern analysis failed'
        }),
        'MCP tool error: analyze_transaction_patterns'
      );
    });

    test('handles fraud detection service errors appropriately', async () => {
      const args = { transactionToken: 'txn_fraud_error' };
      const fraudError = new Error('ML model unavailable');

      reportingService.detectFraud = vi.fn().mockRejectedValue(fraudError);

      await expect(
        patternHandlers.handleDetectFraudIndicators(args, mockRequestId)
      ).rejects.toThrow("Tool 'detect_fraud_indicators' failed: ML model unavailable");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          entityToken: 'txn_frau***',
          error: 'ML model unavailable'
        }),
        'MCP tool error: detect_fraud_indicators'
      );
    });

    test('handles merchant intelligence service errors', async () => {
      const args = { merchantDescriptor: 'UNKNOWN_MERCHANT' };
      const merchantError = new Error('Merchant not found in database');

      mccService.getMerchantIntel = vi.fn().mockRejectedValue(merchantError);

      await expect(
        patternHandlers.handleGenerateMerchantIntelligence(args, mockRequestId)
      ).rejects.toThrow("Tool 'generate_merchant_intelligence' failed: Merchant not found in database");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          merchantIdentifier: 'UNKNOWN_MERCHANT',
          error: 'Merchant not found in database'
        }),
        'MCP tool error: generate_merchant_intelligence'
      );
    });
  });

  describe('MCP Protocol Compliance Tests', () => {
    test('all handlers return proper MCP response format', async () => {
      const mockPatternResponse = {
        patterns: [{ type: 'test', score: 0.5 }],
        anomalies: [],
        confidence: 0.8,
        riskScore: 0.4
      };
      
      reportingService.analyzePatterns = vi.fn().mockResolvedValue(mockPatternResponse);

      const result = await patternHandlers.handleAnalyzeTransactionPatterns(
        { cardToken: 'card_test' }, 
        mockRequestId
      );

      // Verify MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    test('response content is properly JSON formatted for complex data', async () => {
      const complexFraudResult = {
        riskScore: 0.95,
        riskLevel: 'CRITICAL',
        indicators: ['velocity_spike', 'unusual_merchant', 'amount_anomaly'],
        mlPredictions: { 
          deepLearning: 0.97, 
          randomForest: 0.93,
          neuralNetwork: 0.96 
        },
        recommendations: ['block_immediately', 'alert_cardholder', 'investigate_merchant'],
        confidence: 0.98
      };
      
      reportingService.detectFraud = vi.fn().mockResolvedValue(complexFraudResult);

      const result = await patternHandlers.handleDetectFraudIndicators(
        { transactionToken: 'txn_complex_test' }, 
        mockRequestId
      );

      // Verify JSON can be parsed
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.fraudAnalysis.indicators).toEqual(complexFraudResult.indicators);
      expect(parsedContent.fraudAnalysis.mlPredictions).toEqual(complexFraudResult.mlPredictions);
      expect(parsedContent.metadata.requestId).toBe(mockRequestId);
    });

    test('handles optional parameters correctly in MCP format', async () => {
      const minimalArgs = { cardToken: 'card_minimal' };

      reportingService.analyzePatterns = vi.fn().mockResolvedValue({
        patterns: [],
        anomalies: [],
        confidence: 0.5,
        riskScore: 0.1
      });

      const result = await patternHandlers.handleAnalyzeTransactionPatterns(minimalArgs, mockRequestId);

      // Verify defaults are applied and included in response
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.metadata.analysisParams.analysisWindow).toBe('30d');
      expect(parsedResponse.metadata.analysisParams.patternTypes).toEqual(['temporal', 'merchant', 'amount']);
      expect(parsedResponse.metadata.analysisParams.confidenceThreshold).toBe(0.7);
    });
  });

  describe('Performance Tests', () => {
    test('pattern analysis completes within acceptable time limits', async () => {
      const args = { cardToken: 'card_performance_test' };
      
      // Mock service with simulated processing delay
      reportingService.analyzePatterns = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 80));
        return {
          patterns: [{ type: 'temporal', score: 0.8 }],
          anomalies: [],
          confidence: 0.9,
          riskScore: 0.2
        };
      });

      const startTime = Date.now();
      await patternHandlers.handleAnalyzeTransactionPatterns(args, mockRequestId);
      const endTime = Date.now();

      // Handler should complete within 200ms (including 80ms service time)
      expect(endTime - startTime).toBeLessThan(200);
    });

    test('fraud detection handles complex analysis efficiently', async () => {
      const args = {
        transactionToken: 'txn_complex_analysis',
        analysisDepth: 'comprehensive',
        includeMLModels: true
      };

      const complexResult = {
        riskScore: 0.88,
        riskLevel: 'HIGH',
        indicators: Array.from({ length: 10 }, (_, i) => `indicator_${i}`),
        mlPredictions: {
          model1: 0.9, model2: 0.85, model3: 0.92, model4: 0.87, model5: 0.91
        },
        recommendations: ['manual_review', 'additional_checks'],
        confidence: 0.94
      };

      reportingService.detectFraud = vi.fn().mockResolvedValue(complexResult);

      const startTime = Date.now();
      const result = await patternHandlers.handleDetectFraudIndicators(args, mockRequestId);
      const endTime = Date.now();

      // Should handle complex analysis within reasonable time
      expect(endTime - startTime).toBeLessThan(300);
      
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.fraudAnalysis.indicators).toHaveLength(10);
      expect(Object.keys(parsedResponse.fraudAnalysis.mlPredictions)).toHaveLength(5);
    });
  });

  describe('Edge Cases Tests', () => {
    test('handles pattern analysis with no patterns found', async () => {
      const args = { cardToken: 'card_no_patterns' };

      reportingService.analyzePatterns = vi.fn().mockResolvedValue({
        patterns: [],
        anomalies: [],
        confidence: 0.1,
        summary: 'Insufficient data for pattern analysis',
        riskScore: 0.0
      });

      const result = await patternHandlers.handleAnalyzeTransactionPatterns(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.patternAnalysis.patterns).toEqual([]);
      expect(parsedResponse.patternAnalysis.anomalies).toEqual([]);
      expect(parsedResponse.patternAnalysis.riskScore).toBe(0.0);
    });

    test('handles merchant intelligence for new/unknown merchant', async () => {
      const args = { merchantDescriptor: 'NEW_MERCHANT_UNKNOWN' };

      mccService.getMerchantIntel = vi.fn().mockResolvedValue({
        merchantProfile: null,
        riskProfile: { riskScore: 0.5, note: 'Insufficient data' },
        transactionPatterns: null,
        reputation: { score: null, note: 'No reputation data available' },
        recommendations: ['monitor_closely', 'gather_more_data']
      });

      const result = await patternHandlers.handleGenerateMerchantIntelligence(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.merchantIntelligence.merchantProfile).toBeNull();
      expect(parsedResponse.merchantIntelligence.reputation.score).toBeNull();
      expect(parsedResponse.merchantIntelligence.recommendations).toEqual(['monitor_closely', 'gather_more_data']);
    });

    test('handles risk assessment with missing optional flags', async () => {
      const minimalArgs = {
        entityType: 'card',
        entityId: 'card_minimal_risk'
      };

      reportingService.assessRisk = vi.fn().mockResolvedValue({
        riskScore: 0.3,
        riskLevel: 'LOW',
        confidence: 0.8,
        riskFactors: [{ factor: 'velocity', score: 0.2 }],
        analysis: { summary: 'Low risk profile' },
        recommendations: ['continue_monitoring'],
        predictions: { nextRiskScore: 0.25 }
      });

      const result = await patternHandlers.handlePerformRiskAssessment(minimalArgs, mockRequestId);

      // Verify defaults applied
      expect(reportingService.assessRisk).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentType: 'fraud',
          riskFactors: ['velocity', 'amount_deviation', 'merchant_risk', 'behavioral'],
          includeRecommendations: true,
          includePredictions: true,
          confidenceLevel: 0.85
        }),
        mockRequestId
      );

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.riskAssessment.recommendations).toBeDefined();
      expect(parsedResponse.riskAssessment.predictions).toBeDefined();
    });

    test('handles fraud detection with both transaction and card tokens', async () => {
      const args = {
        transactionToken: 'txn_dual_test',
        cardToken: 'card_dual_test',
        riskThreshold: 0.5
      };

      reportingService.detectFraud = vi.fn().mockResolvedValue({
        riskScore: 0.6,
        riskLevel: 'MEDIUM',
        indicators: ['cross_token_analysis'],
        confidence: 0.8,
        recommendations: ['enhanced_monitoring']
      });

      const result = await patternHandlers.handleDetectFraudIndicators(args, mockRequestId);

      // Should use transactionToken (first priority) for entity identification
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.fraudAnalysis.entityToken).toBe('txn_dual***');
      expect(parsedResponse.fraudAnalysis.isFlagged).toBe(true); // 0.6 >= 0.5
    });
  });
});

 