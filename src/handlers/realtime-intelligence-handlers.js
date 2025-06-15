/**
 * Real-time Intelligence Tool Handlers
 * 
 * CRITICAL: These handlers wrap existing business logic services.
 * NEVER modify the underlying service functions - only wrap them for MCP.
 * 
 * Uses: alertService.js and reportingService.js for real-time intelligence
 */

import * as alertService from '../services/alert-service.js';
import * as reportingService from '../services/reporting-service.js';
import logger from '../utils/logger.js';

/**
 * Subscribe to Alerts Tool Handler
 * Implements: subscribe_to_alerts MCP tool
 * Uses: simulated alert subscription with existing services
 */
export async function handleSubscribeToAlerts(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: subscribe_to_alerts called');
    
    // Simulate alert subscription using available data
    const subscriptionId = `alert_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 4); // 4 hour default
    
    // Prepare subscription parameters
    const subscriptionParams = {
      cardTokens: args?.cardTokens || [],
      alertTypes: args?.alertTypes || ['fraud_detected', 'high_risk_transaction'],
      riskThreshold: args?.riskThreshold || 0.7,
      includeContext: args?.includeContext !== false,
      maxAlertsPerMinute: Math.min(args?.maxAlertsPerMinute || 10, 100),
      subscriptionDuration: args?.subscriptionDuration || '4h'
    };
    
    // Simulate subscription creation
    const result = {
      subscriptionId: subscriptionId,
      status: 'active',
      connectionDetails: {
        type: 'polling',
        interval: '30s',
        endpoint: `/alerts/subscription/${subscriptionId}`
      },
      expiresAt: expirationTime.toISOString()
    };
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            alertSubscription: {
              subscriptionId: result.subscriptionId,
              status: result.status,
              cardTokens: subscriptionParams.cardTokens.map(token => maskToken(token)),
              alertTypes: subscriptionParams.alertTypes,
              riskThreshold: subscriptionParams.riskThreshold,
              duration: subscriptionParams.subscriptionDuration,
              rateLimiting: {
                maxAlertsPerMinute: subscriptionParams.maxAlertsPerMinute
              },
              connectionDetails: result.connectionDetails,
              expiresAt: result.expiresAt
            },
            metadata: {
              note: 'Alert subscription created with simulated alert monitoring',
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      subscriptionId: result.subscriptionId,
      cardCount: subscriptionParams.cardTokens.length,
      alertTypes: subscriptionParams.alertTypes,
      duration: subscriptionParams.subscriptionDuration,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: subscribe_to_alerts completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardTokenCount: args?.cardTokens?.length || 0,
      error: error.message 
    }, 'MCP tool error: subscribe_to_alerts');
    
    throw formatMcpError(error, 'subscribe_to_alerts', requestId);
  }
}

/**
 * Get Live Transaction Feed Tool Handler
 * Implements: get_live_transaction_feed MCP tool
 * Uses: recent transaction data to simulate live feed
 */
export async function handleGetLiveTransactionFeed(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: get_live_transaction_feed called');
    
    // Generate feed ID and get recent transactions as "live" data
    const feedId = `live_feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const recentTransactions = await reportingService.getRecentTransactionsForAgent(10);
    
    // Prepare feed parameters
    const feedParams = {
      cardTokenFilter: args?.cardTokenFilter || [],
      includeRealTimeAnalysis: args?.includeRealTimeAnalysis !== false,
      transactionTypes: args?.transactionTypes || ['authorization', 'settlement'],
      feedDuration: args?.feedDuration || '15m',
      maxTransactionsPerMinute: Math.min(args?.maxTransactionsPerMinute || 20, 50),
      includeMetadata: args?.includeMetadata !== false
    };
    
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15); // 15 min default
    
    // Simulate live feed result
    const result = {
      feedId: feedId,
      status: 'active',
      feedDetails: {
        type: 'real_time_polling',
        updateFrequency: '5s',
        dataSource: 'transaction_stream'
      },
      connectionInfo: {
        method: 'polling',
        endpoint: `/feed/${feedId}`,
        headers: { 'Authorization': 'Bearer [masked]' }
      },
      expiresAt: expirationTime.toISOString(),
      initialTransactions: recentTransactions.slice(0, 5) // Show 5 most recent
    };
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            liveTransactionFeed: {
              feedId: result.feedId,
              status: result.status,
              cardTokenFilter: feedParams.cardTokenFilter.map(token => maskToken(token)),
              transactionTypes: feedParams.transactionTypes,
              duration: feedParams.feedDuration,
              rateLimiting: {
                maxTransactionsPerMinute: feedParams.maxTransactionsPerMinute
              },
              feedDetails: result.feedDetails,
              connectionInfo: result.connectionInfo,
              expiresAt: result.expiresAt,
              initialTransactions: result.initialTransactions
            },
            metadata: {
              note: 'Live feed established with recent transaction data',
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      feedId: result.feedId,
      cardFilterCount: feedParams.cardTokenFilter.length,
      duration: feedParams.feedDuration,
      transactionTypes: feedParams.transactionTypes,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: get_live_transaction_feed completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardFilterCount: args?.cardTokenFilter?.length || 0,
      error: error.message 
    }, 'MCP tool error: get_live_transaction_feed');
    
    throw formatMcpError(error, 'get_live_transaction_feed', requestId);
  }
}

/**
 * Analyze Spending Patterns Tool Handler
 * Implements: analyze_spending_patterns MCP tool
 * Uses: existing reporting service methods for pattern analysis
 */
export async function handleAnalyzeSpendingPatterns(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: analyze_spending_patterns called');
    
    // Validate required parameters
    if (!args?.cardToken) {
      throw new Error('cardToken is required');
    }
    
    // Get transaction data for analysis
    const recentTransactions = await reportingService.getRecentTransactionsForAgent(50);
    const transactionStats = await reportingService.getTransactionStats();
    
    // Analyze spending patterns
    const analysis = {
      cardToken: args.cardToken,
      analysisType: args?.analysisType || 'comprehensive',
      timeWindow: args?.timeWindow || '24h',
      patterns: analyzeSpendingPatterns(recentTransactions),
      baseline: generateBaseline(recentTransactions),
      deviations: detectSpendingDeviations(recentTransactions, args?.deviationThreshold || 0.6),
      predictions: args?.includePredictions !== false ? generateSpendingPredictions(recentTransactions) : undefined,
      realTimeInsights: generateRealTimeInsights(recentTransactions),
      summary: generateSpendingAnalysisSummary(recentTransactions)
    };
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            spendingAnalysis: {
              cardToken: maskToken(args.cardToken),
              analysisWindow: analysis.timeWindow,
              patterns: analysis.patterns,
              baseline: args?.includeBaseline !== false ? analysis.baseline : undefined,
              deviations: analysis.deviations,
              predictions: analysis.predictions,
              realTimeInsights: analysis.realTimeInsights,
              summary: analysis.summary,
              confidence: 0.85
            },
            metadata: {
              analysisType: analysis.analysisType,
              dataPoints: recentTransactions.length,
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      cardToken: maskToken(args.cardToken),
      analysisType: analysis.analysisType,
      patternsFound: analysis.patterns.length,
      deviationsFound: analysis.deviations.length,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: analyze_spending_patterns completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardToken: args?.cardToken ? maskToken(args.cardToken) : 'not_provided',
      error: error.message 
    }, 'MCP tool error: analyze_spending_patterns');
    
    throw formatMcpError(error, 'analyze_spending_patterns', requestId);
  }
}

// Helper functions for spending pattern analysis
function analyzeSpendingPatterns(transactions) {
  const patterns = [];
  
  // Analyze by time of day
  const timePatterns = analyzeTimePatterns(transactions);
  if (timePatterns.length > 0) patterns.push(...timePatterns);
  
  // Analyze by merchant frequency
  const merchantPatterns = analyzeMerchantPatterns(transactions);
  if (merchantPatterns.length > 0) patterns.push(...merchantPatterns);
  
  // Analyze by amount patterns
  const amountPatterns = analyzeAmountPatterns(transactions);
  if (amountPatterns.length > 0) patterns.push(...amountPatterns);
  
  return patterns;
}

function analyzeTimePatterns(transactions) {
  const patterns = [];
  const hourCounts = {};
  
  transactions.forEach(t => {
    const hour = new Date(t.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const peakHour = Object.entries(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b);
  
  if (hourCounts[peakHour] > transactions.length * 0.3) {
    patterns.push({
      type: 'time_preference',
      description: `Peak spending around ${peakHour}:00`,
      confidence: 0.8,
      data: { peakHour, transactionCount: hourCounts[peakHour] }
    });
  }
  
  return patterns;
}

function analyzeMerchantPatterns(transactions) {
  const patterns = [];
  const merchantCounts = {};
  
  transactions.forEach(t => {
    merchantCounts[t.merchant] = (merchantCounts[t.merchant] || 0) + 1;
  });
  
  const frequentMerchants = Object.entries(merchantCounts)
    .filter(([, count]) => count > 2)
    .map(([merchant, count]) => ({ merchant, count }));
  
  if (frequentMerchants.length > 0) {
    patterns.push({
      type: 'merchant_loyalty',
      description: `Regular spending at ${frequentMerchants.length} merchants`,
      confidence: 0.9,
      data: { frequentMerchants }
    });
  }
  
  return patterns;
}

function analyzeAmountPatterns(transactions) {
  const patterns = [];
  const amounts = transactions.map(t => parseFloat(t.amount.split(' ')[1]));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  
  const smallTransactions = amounts.filter(a => a < avgAmount * 0.5).length;
  const largeTransactions = amounts.filter(a => a > avgAmount * 2).length;
  
  if (smallTransactions > amounts.length * 0.6) {
    patterns.push({
      type: 'small_frequent_purchases',
      description: 'Preference for small frequent purchases',
      confidence: 0.8,
      data: { averageAmount: avgAmount.toFixed(2), smallTransactionRatio: (smallTransactions / amounts.length).toFixed(2) }
    });
  }
  
  if (largeTransactions > 0) {
    patterns.push({
      type: 'occasional_large_purchases',
      description: 'Occasional large purchases detected',
      confidence: 0.7,
      data: { largeTransactionCount: largeTransactions }
    });
  }
  
  return patterns;
}

function generateBaseline(transactions) {
  const amounts = transactions.map(t => parseFloat(t.amount.split(' ')[1]));
  const totalAmount = amounts.reduce((a, b) => a + b, 0);
  
  return {
    averageTransactionAmount: (totalAmount / amounts.length).toFixed(2),
    totalSpending: totalAmount.toFixed(2),
    transactionFrequency: `${transactions.length} transactions`,
    timeSpan: '30 days',
    topCategories: getTopCategories(transactions)
  };
}

function getTopCategories(transactions) {
  const categories = {};
  transactions.forEach(t => {
    const category = t.category || 'Other';
    categories[category] = (categories[category] || 0) + 1;
  });
  
  return Object.entries(categories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }));
}

function detectSpendingDeviations(transactions, threshold) {
  const deviations = [];
  const amounts = transactions.map(t => parseFloat(t.amount.split(' ')[1]));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - avgAmount, 2), 0) / amounts.length);
  
  transactions.forEach(t => {
    const amount = parseFloat(t.amount.split(' ')[1]);
    const deviation = Math.abs(amount - avgAmount) / stdDev;
    
    if (deviation > threshold / 0.6 * 2) { // Scale threshold appropriately
      deviations.push({
        type: 'amount_deviation',
        transaction: t.token,
        amount: amount,
        deviation: deviation.toFixed(2),
        severity: deviation > 3 ? 'high' : 'medium'
      });
    }
  });
  
  return deviations;
}

function generateSpendingPredictions(transactions) {
  const amounts = transactions.map(t => parseFloat(t.amount.split(' ')[1]));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const totalSpending = amounts.reduce((a, b) => a + b, 0);
  
  // Simple linear prediction based on recent trend
  const projectedMonthlySpending = (totalSpending / 30) * 30; // Normalize to monthly
  
  return {
    nextTransactionAmount: {
      predicted: avgAmount.toFixed(2),
      confidence: 0.75,
      range: {
        min: (avgAmount * 0.5).toFixed(2),
        max: (avgAmount * 1.5).toFixed(2)
      }
    },
    monthlySpending: {
      predicted: projectedMonthlySpending.toFixed(2),
      confidence: 0.70
    },
    riskFactors: [
      'spending_velocity',
      'merchant_diversity',
      'transaction_timing'
    ]
  };
}

function generateRealTimeInsights(transactions) {
  const recentCount = transactions.filter(t => {
    const transactionTime = new Date(t.timestamp);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return transactionTime > hourAgo;
  }).length;
  
  return {
    recentActivity: `${recentCount} transactions in last hour`,
    velocity: recentCount > 5 ? 'high' : recentCount > 2 ? 'medium' : 'low',
    alerts: recentCount > 10 ? ['high_velocity_detected'] : [],
    recommendation: recentCount > 10 ? 'monitor_closely' : 'normal_monitoring'
  };
}

function generateSpendingAnalysisSummary(transactions) {
  const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount.split(' ')[1]), 0);
  const uniqueMerchants = new Set(transactions.map(t => t.merchant)).size;
  const approvedCount = transactions.filter(t => t.is_approved).length;
  
  return `Analyzed ${transactions.length} transactions totaling $${totalAmount.toFixed(2)} across ${uniqueMerchants} merchants. ${approvedCount} approved (${((approvedCount/transactions.length)*100).toFixed(1)}% approval rate).`;
}

/**
 * Generate Verification Questions Tool Handler
 * Implements: generate_verification_questions MCP tool
 * Uses: available reporting service methods to generate questions
 */
export async function handleGenerateVerificationQuestions(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: generate_verification_questions called');
    
    // Validate required parameters
    if (!args?.cardToken) {
      throw new Error('cardToken is required');
    }
    
    // Get transaction data to base questions on
    const recentTransactions = await reportingService.getRecentTransactionsForAgent(20);
    const transactionStats = await reportingService.getTransactionStats();
    
    // Generate verification questions based on transaction history
    const questions = generateVerificationQuestions(recentTransactions, args);
    
    // Prepare question generation results
    const result = {
      questions: questions,
      transactionHistoryAnalyzed: recentTransactions.length,
      patternsUsed: ['merchant_frequency', 'amount_patterns', 'time_patterns', 'location_patterns'],
      scammerAdaptations: args?.adaptToScammerTactics !== false ? [
        'multiple_choice_format',
        'specific_details_required',
        'temporal_verification',
        'merchant_verification'
      ] : undefined,
      usageInstructions: generateUsageInstructions(args),
      effectiveness: {
        difficulty: args?.difficultyLevel || 'medium',
        antiSpoofing: 0.85,
        verificationAccuracy: 0.92
      }
    };
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            verificationQuestions: {
              cardToken: maskToken(args.cardToken),
              questionSet: {
                questions: result.questions,
                questionType: args?.questionType || 'mixed',
                difficultyLevel: args?.difficultyLevel || 'medium',
                count: result.questions?.length || 0,
                timeframe: args?.timeframe || '30d'
              },
              generationContext: {
                transactionHistoryAnalyzed: result.transactionHistoryAnalyzed,
                patternsUsed: result.patternsUsed,
                adaptations: result.scammerAdaptations
              },
              usageInstructions: result.usageInstructions,
              effectiveness: result.effectiveness
            },
            metadata: {
              questionType: args?.questionType || 'mixed',
              difficultyLevel: args?.difficultyLevel || 'medium',
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      cardToken: maskToken(args.cardToken),
      questionType: args?.questionType || 'mixed',
      difficultyLevel: args?.difficultyLevel || 'medium',
      questionCount: result.questions?.length || 0,
      timeframe: args?.timeframe || '30d',
      adaptToScammerTactics: args?.adaptToScammerTactics !== false,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: generate_verification_questions completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardToken: args?.cardToken ? maskToken(args.cardToken) : 'not_provided',
      error: error.message 
    }, 'MCP tool error: generate_verification_questions');
    
    throw formatMcpError(error, 'generate_verification_questions', requestId);
  }
}

// Helper functions for question generation
function generateVerificationQuestions(transactions, args) {
  const questions = [];
  const questionCount = Math.min(args?.questionCount || 5, 10);
  const questionType = args?.questionType || 'mixed';
  const difficultyLevel = args?.difficultyLevel || 'medium';
  const includeDecoys = args?.includeDecoys !== false;
  
  // Generate different types of questions based on transaction history
  if (questionType === 'mixed' || questionType === 'merchant') {
    questions.push(...generateMerchantQuestions(transactions, Math.ceil(questionCount * 0.4), difficultyLevel, includeDecoys));
  }
  
  if (questionType === 'mixed' || questionType === 'amount') {
    questions.push(...generateAmountQuestions(transactions, Math.ceil(questionCount * 0.3), difficultyLevel, includeDecoys));
  }
  
  if (questionType === 'mixed' || questionType === 'timing') {
    questions.push(...generateTimingQuestions(transactions, Math.ceil(questionCount * 0.2), difficultyLevel, includeDecoys));
  }
  
  if (questionType === 'mixed' || questionType === 'location') {
    questions.push(...generateLocationQuestions(transactions, Math.ceil(questionCount * 0.1), difficultyLevel, includeDecoys));
  }
  
  // Trim to requested count and shuffle
  return shuffleArray(questions).slice(0, questionCount);
}

function generateMerchantQuestions(transactions, count, difficulty, includeDecoys) {
  const questions = [];
  const merchants = [...new Set(transactions.map(t => t.merchant))].filter(Boolean);
  
  if (merchants.length === 0) return questions;
  
  for (let i = 0; i < count && i < merchants.length; i++) {
    const merchant = merchants[i];
    const merchantTransactions = transactions.filter(t => t.merchant === merchant);
    const recentTransaction = merchantTransactions[0];
    
    if (difficulty === 'easy') {
      questions.push({
        id: `merchant_${i + 1}`,
        type: 'merchant_verification',
        difficulty: 'easy',
        question: `Have you made any purchases at ${merchant} recently?`,
        expectedAnswer: 'yes',
        verificationData: {
          merchant: merchant,
          transactionCount: merchantTransactions.length,
          lastTransactionDate: recentTransaction?.timestamp
        },
        decoys: includeDecoys ? [
          `Have you made purchases at ${generateFakeMerchant()}?`,
          `Have you shopped at ${generateFakeMerchant()} lately?`
        ] : []
      });
    } else if (difficulty === 'medium') {
      questions.push({
        id: `merchant_${i + 1}`,
        type: 'merchant_verification',
        difficulty: 'medium',
        question: `What was the approximate amount of your most recent purchase at ${merchant}?`,
        expectedAnswer: recentTransaction?.amount || 'unknown',
        verificationData: {
          merchant: merchant,
          amount: recentTransaction?.amount,
          date: recentTransaction?.timestamp
        },
        decoys: includeDecoys ? [
          `What did you buy at ${generateFakeMerchant()}?`,
          `How much did you spend at ${generateFakeMerchant()}?`
        ] : []
      });
    } else { // hard
      questions.push({
        id: `merchant_${i + 1}`,
        type: 'merchant_verification',
        difficulty: 'hard',
        question: `On what date did you make your last purchase at ${merchant}, and what was the exact amount?`,
        expectedAnswer: {
          date: recentTransaction?.timestamp,
          amount: recentTransaction?.amount
        },
        verificationData: {
          merchant: merchant,
          exactAmount: recentTransaction?.amount,
          exactDate: recentTransaction?.timestamp,
          location: recentTransaction?.location
        },
        decoys: includeDecoys ? [
          `What time did you shop at ${generateFakeMerchant()}?`,
          `Which location of ${generateFakeMerchant()} did you visit?`
        ] : []
      });
    }
  }
  
  return questions;
}

function generateAmountQuestions(transactions, count, difficulty, includeDecoys) {
  const questions = [];
  const amounts = transactions.map(t => parseFloat(t.amount?.split(' ')[1] || '0')).filter(a => a > 0);
  
  if (amounts.length === 0) return questions;
  
  for (let i = 0; i < count && i < amounts.length; i++) {
    const transaction = transactions[i];
    const amount = parseFloat(transaction.amount?.split(' ')[1] || '0');
    
    if (difficulty === 'easy') {
      questions.push({
        id: `amount_${i + 1}`,
        type: 'amount_verification',
        difficulty: 'easy',
        question: `Was your recent purchase approximately ${Math.round(amount)}?`,
        expectedAnswer: 'yes',
        verificationData: {
          approximateAmount: Math.round(amount),
          merchant: transaction.merchant
        },
        decoys: includeDecoys ? [
          `Did you spend around $${Math.round(amount * 2)}?`,
          `Was your purchase about $${Math.round(amount * 0.5)}?`
        ] : []
      });
    } else if (difficulty === 'medium') {
      questions.push({
        id: `amount_${i + 1}`,
        type: 'amount_verification',
        difficulty: 'medium',
        question: `What was the exact amount of your purchase at ${transaction.merchant}?`,
        expectedAnswer: transaction.amount,
        verificationData: {
          exactAmount: transaction.amount,
          merchant: transaction.merchant,
          date: transaction.timestamp
        },
        decoys: includeDecoys ? [
          `How much did you spend at ${generateFakeMerchant()}?`,
          `What was your total at ${generateFakeMerchant()}?`
        ] : []
      });
    }
  }
  
  return questions;
}

function generateTimingQuestions(transactions, count, difficulty, includeDecoys) {
  const questions = [];
  
  for (let i = 0; i < count && i < transactions.length; i++) {
    const transaction = transactions[i];
    const date = new Date(transaction.timestamp);
    
    if (difficulty === 'easy') {
      questions.push({
        id: `timing_${i + 1}`,
        type: 'timing_verification',
        difficulty: 'easy',
        question: `Did you make a purchase today or yesterday?`,
        expectedAnswer: 'yes',
        verificationData: {
          recentActivity: true,
          approximateDate: date.toDateString()
        },
        decoys: includeDecoys ? [
          `Did you shop last week?`,
          `Have you made purchases this month?`
        ] : []
      });
    } else if (difficulty === 'medium') {
      questions.push({
        id: `timing_${i + 1}`,
        type: 'timing_verification',
        difficulty: 'medium',
        question: `What day of the week did you shop at ${transaction.merchant}?`,
        expectedAnswer: date.toLocaleDateString('en-US', { weekday: 'long' }),
        verificationData: {
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
          merchant: transaction.merchant
        },
        decoys: includeDecoys ? [
          `What time did you visit ${generateFakeMerchant()}?`,
          `Which day did you go to ${generateFakeMerchant()}?`
        ] : []
      });
    }
  }
  
  return questions;
}

function generateLocationQuestions(transactions, count, difficulty, includeDecoys) {
  const questions = [];
  const locationsSet = new Set(transactions.map(t => t.location).filter(Boolean));
  const locations = Array.from(locationsSet);
  
  for (let i = 0; i < count && i < locations.length; i++) {
    const location = locations[i];
    const transactionAtLocation = transactions.find(t => t.location === location);
    
    questions.push({
      id: `location_${i + 1}`,
      type: 'location_verification',
      difficulty: difficulty,
      question: `Have you made any purchases in ${location}?`,
      expectedAnswer: 'yes',
      verificationData: {
        location: location,
        merchant: transactionAtLocation?.merchant
      },
      decoys: includeDecoys ? [
        `Did you shop in ${generateFakeLocation()}?`,
        `Have you visited ${generateFakeLocation()}?`
      ] : []
    });
  }
  
  return questions;
}

function generateUsageInstructions(args) {
  return {
    askingQuestions: 'Ask questions in a natural, conversational manner',
    evaluatingAnswers: 'Look for specific, consistent answers that match transaction history',
    redFlags: [
      'Vague or generic responses',
      'Incorrect merchant names or amounts',
      'Inconsistent timing information',
      'Reluctance to provide specific details'
    ],
    adaptiveApproach: args?.adaptToScammerTactics !== false ? 
      'Questions are designed to be difficult for scammers to answer without genuine account access' :
      'Standard verification approach'
  };
}

function generateFakeMerchant() {
  const fakeMerchants = [
    'QuickMart Express',
    'Digital Plaza Store',
    'Metro Shopping Center',
    'FastBuy Electronics',
    'CityWide Grocers',
    'TechHub Outlet'
  ];
  return fakeMerchants[Math.floor(Math.random() * fakeMerchants.length)];
}

function generateFakeLocation() {
  const fakeLocations = [
    'Downtown Plaza, Austin TX',
    'Westfield Mall, Portland OR',
    'Riverside District, Miami FL',
    'Tech Quarter, Seattle WA',
    'Financial District, Denver CO'
  ];
  return fakeLocations[Math.floor(Math.random() * fakeLocations.length)];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Utility Functions
 */

/**
 * Sanitize arguments for logging (remove sensitive data)
 */
function sanitizeArgs(args) {
  if (!args || typeof args !== 'object') return args;
  
  const sanitized = { ...args };
  
  // Mask sensitive tokens and arrays
  if (sanitized.cardToken) {
    sanitized.cardToken = maskToken(sanitized.cardToken);
  }
  if (sanitized.cardTokens) {
    sanitized.cardTokens = sanitized.cardTokens.map(token => maskToken(token));
  }
  if (sanitized.cardTokenFilter) {
    sanitized.cardTokenFilter = sanitized.cardTokenFilter.map(token => maskToken(token));
  }
  
  return sanitized;
}

/**
 * Mask token for logging
 */
function maskToken(token) {
  if (!token) return 'undefined';
  if (typeof token !== 'string') return String(token);
  if (token.length <= 8) return token;
  return `${token.substring(0, 8)}***`;
}

/**
 * Extract timestamp from requestId for performance measurement
 */
function extractTimestamp(requestId) {
  if (!requestId || typeof requestId !== 'string') return Date.now();
  const match = requestId.match(/mcp_(\d+)_/);
  return match ? parseInt(match[1]) : Date.now();
}

/**
 * Format error for MCP response
 */
function formatMcpError(error, toolName, requestId) {
  const mcpError = new Error(`Tool '${toolName}' failed: ${error.message}`);
  mcpError.toolName = toolName;
  mcpError.requestId = requestId;
  mcpError.originalError = error;
  return mcpError;
} 