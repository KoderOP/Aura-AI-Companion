import type { MicroStep, TaskCategory } from '../types';

interface ExtractedTaskDetails {
  title: string;
  category: TaskCategory;
  deadline: string;
  importance: number;
  consequence: number;
  effort: number;
  habitPenalty: number;
}

// System instructions for AI parsing
const EXTRACTION_SYSTEM_PROMPT = `
You are Aura, an AI productivity assistant. Extract task details from the user's input.
Return a valid JSON object matching this structure:
{
  "title": "Clean, concise task name",
  "category": "work" | "personal" | "health" | "finance" | "admin",
  "deadline": "YYYY-MM-DDTHH:mm:ssZ" (calculate relative to the current local time),
  "importance": 1-10,
  "consequence": 1-10,
  "effort": 1-10,
  "habitPenalty": 1-10
}
Current local time: {CURRENT_TIME}.
`;

const PLANNING_SYSTEM_PROMPT = `
You are Aura, an AI productivity planner. Decompose the task into an ordered sequence of 3 to 6 micro-steps.
Each step should have an estimated duration (minutes) and be highly actionable.
Return a JSON array of steps matching:
[
  {
    "description": "Short, active step description (e.g. 'Gather 2025 W2 and bank statements')",
    "duration": 15-120
  }
]
`;

// Helper to calculate relative dates deterministically in the mock parser
function parseRelativeDate(text: string): Date {
  const now = new Date();
  const lower = text.toLowerCase();

  let targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default: tomorrow

  if (lower.includes('today')) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
  } else if (lower.includes('tomorrow')) {
    targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    targetDate.setHours(17, 0, 0, 0);
  } else if (lower.includes('tonight')) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0);
  } else if (lower.includes('friday')) {
    const currentDay = now.getDay();
    const distance = (5 - currentDay + 7) % 7 || 7;
    targetDate = new Date(now.getTime() + distance * 24 * 60 * 60 * 1000);
    targetDate.setHours(17, 0, 0, 0);
  } else if (lower.includes('monday')) {
    const currentDay = now.getDay();
    const distance = (1 - currentDay + 7) % 7 || 7;
    targetDate = new Date(now.getTime() + distance * 24 * 60 * 60 * 1000);
    targetDate.setHours(17, 0, 0, 0);
  } else if (lower.includes('next week')) {
    targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (lower.includes('in 2 days')) {
    targetDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  } else if (lower.includes('in a week') || lower.includes('in 7 days')) {
    targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (lower.includes('by 5') || lower.includes('5pm')) {
    targetDate.setHours(17, 0, 0, 0);
  }

  return targetDate;
}

// Local mock parser when no API keys are provided
function localExtractTask(text: string): ExtractedTaskDetails {
  const lower = text.toLowerCase();
  
  // Clean title extraction
  let title = text.replace(/by (tomorrow|today|friday|monday|tonight|next week|5pm|5 pm)/gi, '').trim();
  title = title.replace(/in (2 days|7 days|a week)/gi, '').trim();
  title = title.replace(/high priority|low priority|urgent/gi, '').trim();
  title = title.replace(/^(i need to|have to|must|schedule|create a task to)\s+/i, '').trim();
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Category heuristics
  let category: TaskCategory = 'work';
  if (lower.includes('tax') || lower.includes('pay') || lower.includes('bill') || lower.includes('invoice') || lower.includes('rent')) {
    category = 'finance';
  } else if (lower.includes('doctor') || lower.includes('run') || lower.includes('gym') || lower.includes('workout') || lower.includes('meds')) {
    category = 'health';
  } else if (lower.includes('clean') || lower.includes('buy') || lower.includes('grocery') || lower.includes('laundry') || lower.includes('mom')) {
    category = 'personal';
  } else if (lower.includes('schedule') || lower.includes('book') || lower.includes('renew') || lower.includes('cancel') || lower.includes('email')) {
    category = 'admin';
  }

  // Importance and Consequence heuristics
  let importance = 5;
  let consequence = 4;
  if (lower.includes('urgent') || lower.includes('critical') || lower.includes('important') || lower.includes('must')) {
    importance = 8;
    consequence = 8;
  }
  if (lower.includes('tax') || lower.includes('audit') || lower.includes('bill') || lower.includes('fine')) {
    consequence = 9; // High penalty for missed finance
    importance = 8;
  }
  if (lower.includes('meeting') || lower.includes('interview') || lower.includes('client')) {
    importance = 8;
    consequence = 7;
  }

  // Effort heuristics
  let effort = 3;
  if (lower.includes('write') || lower.includes('draft') || lower.includes('build') || lower.includes('project') || lower.includes('exam') || lower.includes('study')) {
    effort = 7;
  } else if (lower.includes('huge') || lower.includes('hard') || lower.includes('long') || lower.includes('complex')) {
    effort = 9;
  } else if (lower.includes('quick') || lower.includes('check') || lower.includes('send') || lower.includes('call')) {
    effort = 2;
  }

  // Habit penalty heuristics
  let habitPenalty = 2;
  if (lower.includes('again') || lower.includes('late') || lower.includes('struggle') || lower.includes('habit')) {
    habitPenalty = 7;
  }

  const deadline = parseRelativeDate(text).toISOString();

  return {
    title,
    category,
    deadline,
    importance,
    consequence,
    effort,
    habitPenalty
  };
}

// Local mock steps generator when no API keys are provided
function localGenerateSteps(title: string, _category: TaskCategory): Omit<MicroStep, 'id' | 'completed'>[] {
  const lower = title.toLowerCase();

  // Specific micro-action templates based on keywords
  if (lower.includes('tax') || lower.includes('finance') || lower.includes('bill') || lower.includes('pay')) {
    return [
      { description: 'Gather financial records, receipts, and login credentials', duration: 15 },
      { description: 'Verify invoice details, account numbers, and amount owed', duration: 15 },
      { description: 'Fill out official forms or open payment portal', duration: 30 },
      { description: 'Double-check figures and confirm security verification (2FA)', duration: 10 },
      { description: 'Submit transaction and download reference confirmation receipt', duration: 10 }
    ];
  }

  if (lower.includes('meeting') || lower.includes('presentation') || lower.includes('pitch') || lower.includes('deck')) {
    return [
      { description: 'Outline meeting agenda and list core objectives', duration: 15 },
      { description: 'Draft visual slides or shared notes document', duration: 45 },
      { description: 'Review details and rehearse talking points (self-run)', duration: 20 },
      { description: 'Send agenda link to participants and confirm attendance', duration: 10 }
    ];
  }

  if (lower.includes('doctor') || lower.includes('dentist') || lower.includes('health') || lower.includes('appointment')) {
    return [
      { description: 'Check calendar for open blocks next week', duration: 5 },
      { description: 'Call provider clinic or open scheduling portal', duration: 10 },
      { description: 'Provide health insurance detail and lock slot', duration: 10 },
      { description: 'Add location and travel time offsets to calendar', duration: 5 }
    ];
  }

  if (lower.includes('write') || lower.includes('report') || lower.includes('draft') || lower.includes('essay')) {
    return [
      { description: 'Conduct initial research and drop resource URLs in scratchpad', duration: 30 },
      { description: 'Write structural outline (intro, core sections, conclusion)', duration: 20 },
      { description: 'Draft raw contents without self-editing', duration: 60 },
      { description: 'Format layout, fix syntax, and double-check instructions', duration: 30 }
    ];
  }

  if (lower.includes('clean') || lower.includes('laundry') || lower.includes('room') || lower.includes('house')) {
    return [
      { description: 'Collect clutter and return items to their designated rooms', duration: 15 },
      { description: 'Sanitize surfaces, tables, and high-touch areas', duration: 20 },
      { description: 'Vacuum carpets or sweep and mop floors', duration: 25 },
      { description: 'Take out garbage, recycling, and wipe bins', duration: 10 }
    ];
  }

  // Default general fallback template
  return [
    { description: 'Review task details and list required inputs/tools', duration: 10 },
    { description: 'Execute the core work block focusing on draft draft draft', duration: 45 },
    { description: 'Refine details, correct errors, and polish final draft', duration: 15 },
    { description: 'Deliver outcome or mark as completed in records', duration: 5 }
  ];
}

// Call API endpoints
async function callGeminiApi(prompt: string, apiKey: string, systemInstruction: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nUser Input: ${prompt}` }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');
  return text;
}

async function callOpenAiApi(prompt: string, apiKey: string, systemInstruction: string): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI API');
  return text;
}

// EXPORTED SERVICES
export async function extractTaskFromText(
  text: string,
  keys: { geminiKey?: string; openaiKey?: string }
): Promise<ExtractedTaskDetails> {
  // If API keys are available, use LLM
  if (keys.geminiKey) {
    try {
      const systemInstruction = EXTRACTION_SYSTEM_PROMPT.replace('{CURRENT_TIME}', new Date().toISOString());
      const resultText = await callGeminiApi(text, keys.geminiKey, systemInstruction);
      return JSON.parse(resultText) as ExtractedTaskDetails;
    } catch (e) {
      console.error('Gemini extraction failed, falling back to local NLP parser', e);
    }
  } else if (keys.openaiKey) {
    try {
      const systemInstruction = EXTRACTION_SYSTEM_PROMPT.replace('{CURRENT_TIME}', new Date().toISOString());
      const resultText = await callOpenAiApi(text, keys.openaiKey, systemInstruction);
      return JSON.parse(resultText) as ExtractedTaskDetails;
    } catch (e) {
      console.error('OpenAI extraction failed, falling back to local NLP parser', e);
    }
  }

  // Local rule-based fallback
  return localExtractTask(text);
}

export async function generateMicroSteps(
  taskTitle: string,
  taskCategory: TaskCategory,
  keys: { geminiKey?: string; openaiKey?: string }
): Promise<Omit<MicroStep, 'id' | 'completed'>[]> {
  const promptText = `Task Title: "${taskTitle}"\nCategory: "${taskCategory}"`;

  if (keys.geminiKey) {
    try {
      const resultText = await callGeminiApi(promptText, keys.geminiKey, PLANNING_SYSTEM_PROMPT);
      return JSON.parse(resultText) as Omit<MicroStep, 'id' | 'completed'>[];
    } catch (e) {
      console.error('Gemini planner failed, falling back to local steps heuristic', e);
    }
  } else if (keys.openaiKey) {
    try {
      const resultText = await callOpenAiApi(promptText, keys.openaiKey, PLANNING_SYSTEM_PROMPT);
      return JSON.parse(resultText) as Omit<MicroStep, 'id' | 'completed'>[];
    } catch (e) {
      console.error('OpenAI planner failed, falling back to local steps heuristic', e);
    }
  }

  // Local template-based fallback
  return localGenerateSteps(taskTitle, taskCategory);
}
