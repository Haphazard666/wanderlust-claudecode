import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerationConfig,
} from '@google/generative-ai';
import type {
  BudgetLevel,
  Coordinates,
  Expense,
  ItineraryDay,
  Trip,
} from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

function safeJsonParse(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  return JSON.parse(stripped);
}

// ─── Function 1: generateTripItinerary ───────────────────────────────────────

interface GenerateItineraryParams {
  destination: string;
  budget: BudgetLevel;
  pace: string;
  interests: string[];
  dates: {
    mode: 'specific' | 'flexible';
    startDate?: string;
    endDate?: string;
    flexibleMonth?: number;
    flexibleDays?: number;
  };
  customInstructions?: string;
  travelers?: number;
  travelerType?: string;
}

export async function generateTripItinerary(
  params: GenerateItineraryParams
): Promise<{ summary: string; startDate: string; endDate: string; itinerary: ItineraryDay[] }> {
  const {
    destination, budget, pace, interests, dates,
    customInstructions, travelers, travelerType,
  } = params;

  const dateStr =
    dates.mode === 'flexible'
      ? `going in month ${dates.flexibleMonth} for ${dates.flexibleDays} days`
      : `from ${dates.startDate} to ${dates.endDate}`;

  const prompt = `Generate a detailed travel itinerary for ${destination}.
Preferences: Budget: ${budget}, Pace: ${pace}, Interests: ${interests.join(', ')}
Dates: ${dateStr}
Travelers: ${travelers ?? 1} (${travelerType ?? 'solo'})
Special Instructions: ${customInstructions || 'None'}
MANDATORY: For every single item, include precise real-world coordinates (lat, lng). Never use 0,0.`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          summary: { type: SchemaType.STRING },
          startDate: { type: SchemaType.STRING },
          endDate: { type: SchemaType.STRING },
          itinerary: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                day: { type: SchemaType.NUMBER },
                date: { type: SchemaType.STRING },
                items: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      id: { type: SchemaType.STRING },
                      time: { type: SchemaType.STRING },
                      title: { type: SchemaType.STRING },
                      description: { type: SchemaType.STRING },
                      location: { type: SchemaType.STRING },
                      coordinates: {
                        type: SchemaType.OBJECT,
                        properties: {
                          lat: { type: SchemaType.NUMBER },
                          lng: { type: SchemaType.NUMBER },
                        },
                        required: ['lat', 'lng'],
                      },
                      category: {
                        type: SchemaType.STRING,
                        enum: ['activity', 'accommodation', 'transport', 'dining', 'market', 'leisure'],
                      },
                      costEstimate: { type: SchemaType.NUMBER },
                    },
                    required: ['id', 'time', 'title', 'description', 'location', 'coordinates', 'category', 'costEstimate'],
                  },
                },
              },
              required: ['day', 'date', 'items'],
            },
          },
        },
        required: ['summary', 'startDate', 'endDate', 'itinerary'],
      },
    } as unknown as GenerationConfig,
  });

  const result = await model.generateContent(prompt);
  const data = safeJsonParse(result.response.text()) as {
    summary: string;
    startDate: string;
    endDate: string;
    itinerary: ItineraryDay[];
  };
  return data;
}

// ─── Function 2: modifyItineraryDay ──────────────────────────────────────────

export async function modifyItineraryDay(
  day: ItineraryDay,
  instruction: string,
  destination: string,
  customInstructions?: string
): Promise<ItineraryDay> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.NUMBER },
          date: { type: SchemaType.STRING },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                time: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                location: { type: SchemaType.STRING },
                coordinates: {
                  type: SchemaType.OBJECT,
                  properties: {
                    lat: { type: SchemaType.NUMBER },
                    lng: { type: SchemaType.NUMBER },
                  },
                  required: ['lat', 'lng'],
                },
                category: {
                  type: SchemaType.STRING,
                  enum: ['activity', 'accommodation', 'transport', 'dining', 'market', 'leisure'],
                },
                costEstimate: { type: SchemaType.NUMBER },
              },
              required: ['id', 'time', 'title', 'description', 'location', 'coordinates', 'category', 'costEstimate'],
            },
          },
        },
        required: ['day', 'date', 'items'],
      },
    } as unknown as GenerationConfig,
  });

  const prompt = `You are editing a travel itinerary day for ${destination}.
Current day data: ${JSON.stringify(day)}
User instruction: ${instruction}
${customInstructions ? `Additional context: ${customInstructions}` : ''}
Rewrite the day's items based on the instruction. Keep the same day number and date. Include precise real-world coordinates for every item.`;

  const result = await model.generateContent(prompt);
  return safeJsonParse(result.response.text()) as ItineraryDay;
}

// ─── Function 3: analyzeExpenses ─────────────────────────────────────────────

export async function analyzeExpenses(
  expenses: Expense[],
  budgetLevel: BudgetLevel
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `Analyze these travel expenses for a ${budgetLevel} trip. Identify spending patterns and suggest 3 specific savings opportunities.

Expenses: ${JSON.stringify(expenses)}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── Function 4: analyzeDocument ─────────────────────────────────────────────

export async function analyzeDocument(
  base64: string,
  mimeType: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent([
    {
      inlineData: { data: base64, mimeType },
    },
    'Analyze this travel document. Provide a concise summary of key details a traveler needs to know.',
  ]);
  return result.response.text();
}

// ─── Function 5: getLocalRecommendations ─────────────────────────────────────

interface LocationResult {
  title: string;
  lat: number;
  lng: number;
  description: string;
}

interface RecommendationsResult {
  text: string;
  locations: LocationResult[];
}

export async function getLocalRecommendations(
  destination: string,
  category: string,
  coords?: Coordinates
): Promise<RecommendationsResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{ googleSearch: {} }],
  } as unknown as Parameters<typeof genAI.getGenerativeModel>[0]);

  const coordsHint = coords ? ` near coordinates (${coords.lat}, ${coords.lng})` : '';
  const prompt = `Recommend the best ${category} in ${destination}${coordsHint}.
For each recommendation provide the name, latitude, longitude, and a short description.
Return your answer as JSON: { "text": "overview text", "locations": [{ "title": "...", "lat": 0, "lng": 0, "description": "..." }] }`;

  const result = await model.generateContent(prompt);
  return safeJsonParse(result.response.text()) as RecommendationsResult;
}

// ─── Function 6: searchMapPOIs ───────────────────────────────────────────────

export async function searchMapPOIs(
  destination: string,
  query: string
): Promise<RecommendationsResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{ googleSearch: {} }],
  } as unknown as Parameters<typeof genAI.getGenerativeModel>[0]);

  const prompt = `Search for "${query}" in ${destination}.
For each result provide the name, latitude, longitude, and a short description.
Return your answer as JSON: { "text": "overview text", "locations": [{ "title": "...", "lat": 0, "lng": 0, "description": "..." }] }`;

  const result = await model.generateContent(prompt);
  return safeJsonParse(result.response.text()) as RecommendationsResult;
}

// ─── Function 7: optimizeDayOrder ────────────────────────────────────────────

export async function optimizeDayOrder(
  day: ItineraryDay,
  destination: string
): Promise<{ optimizedDay: ItineraryDay; rationale: string }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Step 1: Analyze route inefficiency
  const analysisResult = await model.generateContent(
    `Analyze the route efficiency of this itinerary day in ${destination}. Identify any backtracking or inefficient ordering.
Day data: ${JSON.stringify(day)}
Return a brief analysis as plain text.`
  );
  const analysis = analysisResult.response.text();

  // Step 2: Reorder and adjust times
  const optimizeModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          optimizedDay: {
            type: SchemaType.OBJECT,
            properties: {
              day: { type: SchemaType.NUMBER },
              date: { type: SchemaType.STRING },
              items: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    id: { type: SchemaType.STRING },
                    time: { type: SchemaType.STRING },
                    title: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    location: { type: SchemaType.STRING },
                    coordinates: {
                      type: SchemaType.OBJECT,
                      properties: {
                        lat: { type: SchemaType.NUMBER },
                        lng: { type: SchemaType.NUMBER },
                      },
                      required: ['lat', 'lng'],
                    },
                    category: {
                      type: SchemaType.STRING,
                      enum: ['activity', 'accommodation', 'transport', 'dining', 'market', 'leisure'],
                    },
                    costEstimate: { type: SchemaType.NUMBER },
                  },
                  required: ['id', 'time', 'title', 'description', 'location', 'coordinates', 'category', 'costEstimate'],
                },
              },
            },
            required: ['day', 'date', 'items'],
          },
          rationale: { type: SchemaType.STRING },
        },
        required: ['optimizedDay', 'rationale'],
      },
    } as unknown as GenerationConfig,
  });

  const optimizeResult = await optimizeModel.generateContent(
    `Based on this route analysis: ${analysis}

Reorder and adjust the times of this itinerary day in ${destination} to minimize travel time and maximize efficiency.
Day data: ${JSON.stringify(day)}
Keep all the same items but reorder them geographically and adjust times accordingly.`
  );

  return safeJsonParse(optimizeResult.response.text()) as {
    optimizedDay: ItineraryDay;
    rationale: string;
  };
}

// ─── Function 8: createTripChat ──────────────────────────────────────────────

export function createTripChat(
  trip: Trip,
  onUpdateItinerary: (dayNumber: number, updatedDay: ItineraryDay) => void
) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `You are a helpful travel assistant for a trip to ${trip.destination} (${trip.startDate} to ${trip.endDate}).
Budget: ${trip.budget}, Pace: ${trip.pace}, Interests: ${trip.interests.join(', ')}.
Current itinerary: ${JSON.stringify(trip.itinerary)}
${trip.customInstructions ? `Special instructions: ${trip.customInstructions}` : ''}
You can update the itinerary for a specific day by calling the updateItineraryDay function.`,
    tools: [
      {
        functionDeclarations: [
          {
            name: 'updateItineraryDay',
            description: 'Update the itinerary for a specific day with new items',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                dayNumber: {
                  type: SchemaType.NUMBER,
                  description: 'The day number to update',
                },
                updatedDay: {
                  type: SchemaType.OBJECT,
                  description: 'The updated day object with items',
                  properties: {
                    day: { type: SchemaType.NUMBER },
                    date: { type: SchemaType.STRING },
                    items: {
                      type: SchemaType.ARRAY,
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          id: { type: SchemaType.STRING },
                          time: { type: SchemaType.STRING },
                          title: { type: SchemaType.STRING },
                          description: { type: SchemaType.STRING },
                          location: { type: SchemaType.STRING },
                          coordinates: {
                            type: SchemaType.OBJECT,
                            properties: {
                              lat: { type: SchemaType.NUMBER },
                              lng: { type: SchemaType.NUMBER },
                            },
                            required: ['lat', 'lng'],
                          },
                          category: {
                            type: SchemaType.STRING,
                            format: 'enum',
                            enum: ['activity', 'accommodation', 'transport', 'dining', 'market', 'leisure'],
                          },
                          costEstimate: { type: SchemaType.NUMBER },
                        },
                        required: ['id', 'time', 'title', 'description', 'location', 'coordinates', 'category', 'costEstimate'],
                      },
                    },
                  },
                  required: ['day', 'date', 'items'],
                },
              },
              required: ['dayNumber', 'updatedDay'],
            },
          },
        ],
      },
    ],
  });

  const chat = model.startChat();

  async function sendMessage(
    text: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const result = await chat.sendMessageStream(text);
    let fullText = '';

    for await (const chunk of result.stream) {
      const fnCalls = chunk.functionCalls();
      if (fnCalls && fnCalls.length > 0) {
        for (const call of fnCalls) {
          if (call.name === 'updateItineraryDay') {
            const args = call.args as { dayNumber: number; updatedDay: ItineraryDay };
            onUpdateItinerary(args.dayNumber, args.updatedDay);
          }
        }
      }

      const chunkText = chunk.text();
      if (chunkText) {
        fullText += chunkText;
        onChunk(chunkText);
      }
    }

    return fullText;
  }

  return sendMessage;
}

// ─── Function 9: generateTripCoverImage ──────────────────────────────────────

export async function generateTripCoverImage(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseModalities: ['image', 'text'],
      imageOptions: { aspectRatio: '16:9' },
    } as unknown as GenerationConfig,
  });

  const result = await model.generateContent(prompt);
  const parts = result.response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('No image generated');

  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('No image data in response');
}

// ─── Function 10: generateSpeech ─────────────────────────────────────────────

export async function generateSpeech(text: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseModalities: ['audio'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    } as unknown as GenerationConfig,
  });

  const result = await model.generateContent(text);
  const parts = result.response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('No audio generated');

  for (const part of parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  throw new Error('No audio data in response');
}
