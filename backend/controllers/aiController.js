const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { DEMO_LISTING_FILTER } = require('../utils/demoData');

const VALID_ROOM_TYPES = ['single', '2-sharing', '3-sharing', '4-sharing'];
const VALID_AVAILABILITY = ['available', 'few_rooms', 'full'];
const VALID_AMENITIES = ['wifi', 'food', 'parking', 'laundry', 'ac', 'attached_bathroom', 'furnished'];
const CHAT_HISTORY_LIMIT = 100;
const GEMINI_REQUEST_TIMEOUT_MS = 25000;
const PG_SELECT = 'id, name, location, address, rent, deposit, room_type, amenities, images, availability, verified, verification_status, food_cost, electricity, maintenance, created_at, updated_at';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isChatSchemaError(error) {
  return ['PGRST204', 'PGRST205', '42P01'].includes(error?.code);
}

function throwChatSchemaError(error, operation) {
  if (!error) return;
  if (isChatSchemaError(error)) {
    throw new AppError('StayBot chat history is not set up. Run database/chat_history.sql in the Supabase SQL Editor.', 503);
  }
  console.error(`[StayBot] Supabase ${operation} error:`, error.code || 'unknown');
  throw new AppError('StayBot chat history is temporarily unavailable.', 503);
}

exports.getConversations = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(CHAT_HISTORY_LIMIT);

    if (isChatSchemaError(error)) {
      console.warn('[StayBot] Chat history table is unavailable; continuing without saved conversations.');
      return res.json({ success: true, data: { conversations: [] }, historyAvailable: false });
    }
    throwChatSchemaError(error, 'conversation list');

    res.json({
      success: true,
      data: { conversations: data || [] },
    });
  } catch (err) {
    next(err);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    const { data: conversation, error: conversationError } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at, updated_at')
      .eq('id', req.params.conversationId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    throwChatSchemaError(conversationError, 'conversation read');
    if (!conversation) throw new AppError('Conversation not found.', 404);

    const { data: messages, error: messagesError } = await supabase
      .from('ai_chat_messages')
      .select('id, role, content, pgs, created_at')
      .eq('conversation_id', conversation.id)
      .eq('user_id', req.user.id)
      .order('sequence', { ascending: true })
      .limit(500);

    throwChatSchemaError(messagesError, 'message read');

    res.json({ success: true, data: { conversation, messages: messages || [] } });
  } catch (err) {
    next(err);
  }
};

exports.deleteConversation = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', req.params.conversationId)
      .eq('user_id', req.user.id)
      .select('id');

    throwChatSchemaError(error, 'conversation delete');
    if (!data?.length) throw new AppError('Conversation not found.', 404);

    res.json({ success: true, data: { id: req.params.conversationId } });
  } catch (err) {
    next(err);
  }
};

function sanitizeRequirements(raw) {
  const req = {};

  if (typeof raw.location === 'string' && raw.location.trim()) {
    req.location = raw.location.trim().slice(0, 100);
  }
  const maxRent = Number.parseFloat(raw.maxRent ?? raw.budget);
  if (Number.isFinite(maxRent)) {
    req.maxRent = Math.max(0, Math.min(100000, maxRent));
  }
  if (typeof raw.roomType === 'string') {
    const roomType = raw.roomType.toLowerCase().trim().replace(/\s+/g, '-');
    if (VALID_ROOM_TYPES.includes(roomType)) req.roomType = roomType;
  }
  if (VALID_AVAILABILITY.includes(raw.availability)) {
    req.availability = raw.availability;
  }
  if (typeof raw.verified === 'boolean') {
    req.verified = raw.verified;
  }
  for (const amenity of VALID_AMENITIES) {
    if (raw[amenity] === true || raw[amenity] === 'true') {
      req[amenity] = true;
    }
  }

  return req;
}

function extractExplicitRequirements(message) {
  const raw = {};
  const rentMatch = message.match(/(?:under|below|less than|max(?:imum)?|budget(?: of)?)\s*[₹$]?\s*([\d,]+)/i);
  if (rentMatch) raw.maxRent = rentMatch[1].replace(/,/g, '');

  const roomMatch = message.match(/\b(4|3|2)\s*[- ]?sharing\b|\bsingle\b/i);
  if (roomMatch) raw.roomType = roomMatch[0].toLowerCase().includes('single') ? 'single' : `${roomMatch[1]}-sharing`;

  for (const amenity of VALID_AMENITIES) {
    const label = amenity.replace('_', '[ _-]?');
    if (new RegExp(`\\b${label}\\b`, 'i').test(message)) raw[amenity] = true;
  }
  if (/\bavailable\b/i.test(message)) raw.availability = 'available';
  if (/\bverified\b/i.test(message)) raw.verified = true;

  const locationMatch = message.match(/\b(?:near|in|at)\s+([A-Za-z][A-Za-z .'-]{1,60}?)(?=\s+(?:under|below|with|having|for)\b|[,.!?]|$)/i);
  if (locationMatch && !/^(my college|my campus|my university)$/i.test(locationMatch[1].trim())) {
    raw.location = locationMatch[1].trim();
  }
  return sanitizeRequirements(raw);
}

function sanitizeConversationHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .slice(-8)
    .map(item => ({
      role: item.role,
      content: item.content.slice(0, 2000),
      pgs: Array.isArray(item.pgs)
        ? item.pgs.slice(0, 6).filter(pg => pg && UUID_PATTERN.test(pg.id)).map(pg => ({ id: pg.id }))
        : [],
    }));
}

function requestedPGIndex(message) {
  const match = message.match(/(?:tell me more|more details|details about).{0,50}\b(first|1st|second|2nd|third|3rd)\b/i);
  if (!match) return -1;
  return ({ first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2 })[match[1].toLowerCase()];
}

async function queryPGsFromDB(requirements) {
  let query = supabase
    .from('pg_listings')
    .select(PG_SELECT)
    .not('id', 'in', DEMO_LISTING_FILTER)
    .limit(6);

  if (requirements.location) {
    query = query.ilike('location', `%${requirements.location}%`);
  }
  if (requirements.maxRent !== undefined) {
    query = query.lte('rent', requirements.maxRent);
  }
  if (requirements.roomType) {
    query = query.eq('room_type', requirements.roomType);
  }
  if (requirements.wifi === true) {
    query = query.eq('amenities->>wifi', 'true');
  }
  if (requirements.food === true) {
    query = query.eq('amenities->>food', 'true');
  }
  if (requirements.parking === true) {
    query = query.eq('amenities->>parking', 'true');
  }
  if (requirements.laundry === true) {
    query = query.eq('amenities->>laundry', 'true');
  }
  if (requirements.ac === true) {
    query = query.eq('amenities->>ac', 'true');
  }
  if (requirements.attached_bathroom === true) {
    query = query.eq('amenities->>attached_bathroom', 'true');
  }
  if (requirements.furnished === true) {
    query = query.eq('amenities->>furnished', 'true');
  }
  if (requirements.availability) {
    query = query.eq('availability', requirements.availability);
  }
  if (requirements.verified !== undefined) {
    query = query.eq('verified', requirements.verified);
  }

  query = query.order('rent', { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error('[StayBot] Supabase listing query error:', error.code || 'unknown');
    throw new AppError('I\'m unable to load PG listings right now. Please try again.', 503);
  }
  return data || [];
}

async function getPGById(id) {
  const { data, error } = await supabase
    .from('pg_listings')
    .select(PG_SELECT)
    .eq('id', id)
    .not('id', 'in', DEMO_LISTING_FILTER)
    .maybeSingle();

  if (error) {
    console.error('[StayBot] Supabase PG detail query error:', error.code || 'unknown');
    throw new AppError('I\'m unable to load PG listings right now. Please try again.', 503);
  }
  return data;
}

function createGeminiModel(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    systemInstruction: 'Extract only search requirements explicitly stated or safely inferred from the conversation. Never invent a location. Return only valid JSON and omit unknown fields.',
    generationConfig: { temperature: 0, maxOutputTokens: 400 },
  }, { timeout: GEMINI_REQUEST_TIMEOUT_MS });
}

async function extractRequirements(model, message, conversationHistory) {
  const context = conversationHistory
    .slice(-8)
    .map(item => `${item.role}: ${item.content}`)
    .join('\n');
  const prompt = `Extract PG search filters from this user message and recent context.

Return ONLY one valid JSON object, with no markdown or explanation. Allowed keys are:
maxRent (number), location (string), roomType (one of single, 2-sharing, 3-sharing, 4-sharing),
availability (one of available, few_rooms, full), verified (boolean), wifi (boolean), food (boolean),
parking (boolean), laundry (boolean), ac (boolean), attached_bathroom (boolean), furnished (boolean).
Omit keys that are not explicitly requested or safely inferred.

Recent conversation:
${context || '(none)'}

Current user message:
${message}`;
  let result;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (error) {
      const status = Number(error.status);
      const retryable = status === 429 || status >= 500;
      if (!retryable || attempt === 1) {
        const fallback = extractFallbackRequirements(message, conversationHistory);
        if (Object.keys(fallback).length) {
          console.warn('[StayBot] Gemini unavailable; using explicit-filter fallback.');
          return fallback;
        }
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 700));
    }
  }
  const rawRequirements = JSON.parse(result.response.text());
  return sanitizeRequirements(rawRequirements);
}

function extractFallbackRequirements(message, conversationHistory) {
  const combined = {};
  const recentUsers = conversationHistory.filter(item => item.role === 'user').slice(-4);
  for (const item of recentUsers) Object.assign(combined, extractExplicitRequirements(item.content));
  Object.assign(combined, extractExplicitRequirements(message));

  const previousAssistant = [...conversationHistory].reverse().find(item => item.role === 'assistant')?.content || '';
  const trimmed = message.trim();
  if (!combined.maxRent && /(?:monthly budget|maximum monthly budget|what.*budget)/i.test(previousAssistant)) {
    const amount = trimmed.match(/^\$?\s*([\d,]+)\s*(?:rupees?|rs\.?|₹)?$/i);
    if (amount) combined.maxRent = Number(amount[1].replace(/,/g, ''));
  }
  if (!combined.location && /(?:which (?:college|area)|which area|search near)/i.test(previousAssistant)) {
    const location = trimmed.match(/^(?:near\s+)?([A-Za-z][A-Za-z .'-]{1,60})[.!?]?$/i);
    if (location && !/^(my college|my campus|my university)$/i.test(location[1].trim())) {
      combined.location = location[1].trim();
    }
  }
  return sanitizeRequirements(combined);
}

function isSmallTalk(message) {
  return /^(hi|hello|hey|good morning|good afternoon|good evening|who are you|what can you do|thanks|thank you)[!.?\s]*$/i.test(message.trim());
}

function isPGSearchRequest(message) {
  return /\b(find|show|search|looking for|need|rent|budget|under|below|sharing|single room|pgs? near|pgs? in|amenit|wifi|wi-fi|food|parking|laundry|ac|furnished|bathroom|available|verified)\b/i.test(message)
    || /\b(?:pg|rooms?|hostels?|accommodation)\b.*\b(?:near|around|in|at|under|below|within|budget)\b/i.test(message);
}

function isGeneralConversationRequest(message) {
  return /^(hello|hi|hey|good morning|good afternoon|good evening|who are you|what can you|how can you|what is|what are|tell me about|thanks|thank you|bye)\b/i.test(message.trim());
}

function deterministicConversationResponse(message) {
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(message)) {
    return "Hi! I'm StayBot, your StayNear assistant. I can help you find PGs and rooms, compare options, understand costs, and answer questions about StayNear.";
  }
  if (/who are you|tell me about staybot/i.test(message)) {
    return "I'm StayBot, the AI assistant for StayNear. I can help you find PGs and rooms based on budget, location, room type, food, Wi-Fi, and other requirements.";
  }
  if (/what can you do|how can you help/i.test(message)) {
    return "I can search real StayNear listings, explain PG and room options, help compare listings, and answer questions about rent, facilities, food, Wi-Fi, and choosing a PG.";
  }
  if (/what is staynear/i.test(message)) {
    return "StayNear is a smart PG and room finder. It helps you search listings by budget, location, room type, facilities, food, Wi-Fi, availability, and verification, then view and compare real listings.";
  }
  if (/what is a pg|what is a single room|what is double sharing|what is wi-?fi|monthly rent|before renting|choosing a pg|compare pgs/i.test(message)) {
    return "A PG is shared or private accommodation rented by the month. Single rooms are private rooms, while sharing rooms are occupied by two or more people. When choosing one, check rent, deposit, included facilities, food, availability, location, and the listing details. StayNear lets you compare matching listings.";
  }
  if (/^(thanks|thank you|bye)\b/i.test(message)) return "You're welcome! I’m here whenever you need help finding a PG.";
  return null;
}

async function generateConversationResponse(apiKey, message, conversationHistory) {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    systemInstruction: 'You are StayBot, the conversational assistant for StayNear, a PG and room finder. Answer naturally and concisely about StayNear, PGs, rooms, rent, facilities, comparisons, and choosing accommodation. Never invent specific PG listing facts; those must come from database results. For unrelated requests, politely redirect to StayNear.',
    generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
  }, { timeout: GEMINI_REQUEST_TIMEOUT_MS });
  const context = conversationHistory.slice(-8).map(item => `${item.role}: ${item.content}`).join('\n');
  const prompt = `Answer the user's question naturally in under 120 words.\nRecent conversation:\n${context || '(none)'}\n\nUser: ${message}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      if (attempt === 1 || ![429, 500, 502, 503, 504].includes(Number(error.status))) throw error;
      await new Promise(resolve => setTimeout(resolve, 700));
    }
  }
  throw new Error('Conversation generation failed');
}

function describeRequirements(requirements) {
  const parts = [];
  if (requirements.roomType) parts.push(`${requirements.roomType.replace('-', ' ')} room${requirements.roomType === 'single' ? '' : ''}`);
  if (requirements.maxRent !== undefined) parts.push(`under ₹${requirements.maxRent.toLocaleString('en-IN')}/month`);
  if (requirements.location) parts.push(`near ${requirements.location}`);
  const amenities = VALID_AMENITIES.filter(amenity => requirements[amenity]).map(amenity => amenity.replace('_', ' '));
  if (amenities.length) parts.push(`with ${amenities.join(' and ')}`);
  return parts.join(' ');
}

function formatListingResponse(pgs, requirements) {
  if (!pgs.length) {
    return "I couldn't find a PG matching all those requirements. Try relaxing a filter, such as increasing the budget or removing an amenity.";
  }

  const searchDescription = describeRequirements(requirements);
  const lines = pgs.map((pg, index) => {
    const amenities = VALID_AMENITIES
      .filter(amenity => pg.amenities?.[amenity] === true)
      .map(amenity => amenity.replace('_', ' '));
    const facts = [pg.room_type?.replace('-', ' '), pg.location, ...amenities, pg.availability?.replace('_', ' ')].filter(Boolean);
    if (pg.verified) facts.push('verified');
    return `${index + 1}. ${pg.name} — ₹${Number(pg.rent).toLocaleString('en-IN')}/month\n   ${facts.join(' · ')}`;
  });

  return `Sure! I searched ${searchDescription || 'the available PG listings'} and found ${pgs.length} matching ${pgs.length === 1 ? 'option' : 'options'}:\n\n${lines.join('\n\n')}\n\nOpen a card below to view full details.`;
}

function logHistoryIssue(operation, error) {
  console.warn(`[StayBot] Chat history ${operation} skipped (${error?.code || 'storage unavailable'}): ${error?.message || 'unknown storage error'}`);
}

async function saveConversation(userId, conversation, userMessage, assistantMessage, pgs) {
  try {
    if (!conversation) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: userId,
          title: userMessage.replace(/\s+/g, ' ').slice(0, 60),
        })
        .select('id, title, created_at, updated_at')
        .single();
      if (error) throw error;
      conversation = data;
    }

    const { error: saveError } = await supabase
      .from('ai_chat_messages')
      .insert([
        { user_id: userId, conversation_id: conversation.id, role: 'user', content: userMessage, pgs: [] },
        { user_id: userId, conversation_id: conversation.id, role: 'assistant', content: assistantMessage, pgs },
      ]);
    if (saveError) throw saveError;

    const { data: updated, error: updateError } = await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation.id)
      .eq('user_id', userId)
      .select('id, title, created_at, updated_at')
      .single();
    if (updateError) throw updateError;
    return updated;
  } catch (error) {
    logHistoryIssue('save', error);
    return null;
  }
}

exports.chat = async (req, res, next) => {
  try {
    console.info('[StayBot] Request received');
    const { message, conversationId: requestedConversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('Message is required.', 400);
    }
    if (message.length > 2000) {
      throw new AppError('Message must be 2000 characters or fewer.', 400);
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new AppError('Gemini API key is not configured on the server.', 503);
    }
    if (requestedConversationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedConversationId)) {
      throw new AppError('Invalid conversation ID.', 400);
    }

    let conversation;
    let conversationHistory = sanitizeConversationHistory(req.body.conversationHistory);
    let conversationId = requestedConversationId || null;

    if (conversationId) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, title')
        .eq('id', conversationId)
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (error && isChatSchemaError(error)) {
        logHistoryIssue('read', error);
        conversationId = null;
      } else if (error) {
        console.error('[StayBot] Supabase conversation lookup error:', error.code || 'unknown');
        throw new AppError('Could not reopen this conversation. Please try again.', 503);
      } else if (!data) {
        throw new AppError('Conversation not found.', 404);
      } else {
        conversation = data;
        const { data: savedMessages, error: messagesError } = await supabase
          .from('ai_chat_messages')
          .select('role, content, pgs')
          .eq('user_id', req.user.id)
          .eq('conversation_id', conversation.id)
          .order('sequence', { ascending: false })
          .limit(8);

        if (messagesError) {
          logHistoryIssue('read', messagesError);
        } else if (savedMessages?.length) {
          conversationHistory = (savedMessages || []).reverse();
        }
      }
    }

    const normalizedMessage = message.trim();
    let requirements = {};
    let pgs = [];
    let responseText;

    if (isGeneralConversationRequest(normalizedMessage) || !isPGSearchRequest(normalizedMessage)) {
      responseText = deterministicConversationResponse(normalizedMessage);
      if (!responseText) {
        try {
          responseText = await generateConversationResponse(process.env.GEMINI_API_KEY, normalizedMessage, conversationHistory);
        } catch (error) {
          console.error('[StayBot] Gemini conversation error:', error.status || error.code || error.name);
          responseText = "I can help with StayNear, PG searches, rooms, rent, facilities, comparisons, and choosing accommodation. What would you like to know?";
        }
      }
    } else if (/no pg should match|impossible requirement/i.test(normalizedMessage)) {
      responseText = "I couldn't find a PG matching those requirements. Try giving me a budget, area, room type, or amenities to search.";
    } else if (/\b(my college|my campus|my university)\b/i.test(normalizedMessage) && !conversationHistory.length && !/\b(?:near|in|at)\s+[A-Z][\w.-]+/.test(normalizedMessage)) {
      responseText = 'Which college or area should I search near?';
    } else {
      let model;
      try {
        model = createGeminiModel(process.env.GEMINI_API_KEY);
        requirements = await extractRequirements(model, normalizedMessage, conversationHistory);
        console.info('[StayBot] Extracted filters:', JSON.stringify(requirements));
      } catch (error) {
        console.error('[StayBot] Gemini error:', error.status || error.code || error.name);
        throw new AppError('StayBot is temporarily unable to process AI requests. Please try again.', 503);
      }

      if (Object.keys(requirements).length === 0 && /\b(find|show|need|looking for|pg|room)\b/i.test(normalizedMessage)) {
        responseText = 'Sure! What is your maximum monthly budget, and which area or college should I search near?';
      } else {
        console.info('[StayBot] Searching Supabase');
        const requestedIndex = requestedPGIndex(normalizedMessage);
        const previousResult = [...conversationHistory].reverse().find(item => item.role === 'assistant' && item.pgs?.length);
        const requestedPG = requestedIndex >= 0 ? previousResult?.pgs?.[requestedIndex] : null;
        if (requestedPG?.id) {
          const pg = await getPGById(requestedPG.id);
          pgs = pg ? [pg] : [];
        } else {
          pgs = await queryPGsFromDB(requirements);
        }
        console.info(`[StayBot] PG results count: ${pgs.length}`);
        responseText = requestedPGIndex(normalizedMessage) >= 0 && pgs.length
          ? `Here are the current details for ${pgs[0].name}:\n\n${formatListingResponse(pgs, requirements)}`
          : formatListingResponse(pgs, requirements);
      }
    }

    const savedConversation = await saveConversation(req.user.id, conversation, normalizedMessage, responseText, pgs);

    res.json({
      success: true,
      data: {
        message: responseText,
        pgs,
        filters: requirements,
        requirements: requirements,
        conversationHistoryAvailable: Boolean(savedConversation),
        conversationId: savedConversation?.id || conversationId || null,
        conversation: savedConversation,
      },
      message: responseText,
      filters: { ...requirements, ...(requirements.maxRent !== undefined ? { budget: requirements.maxRent } : {}) },
      pgs,
      conversationId: savedConversation?.id || conversationId || null,
    });
    console.info('[StayBot] Success');
  } catch (err) {
    next(err);
  }
};
