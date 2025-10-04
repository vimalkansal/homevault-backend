import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import fs from 'fs';

export interface ItemIdentification {
  name: string;
  description: string;
  suggestedCategories: string[];
  confidence: number;
}

export class AIService {
  private model: ChatOpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000,
    });
  }

  async identifyItemFromImage(imagePath: string): Promise<ItemIdentification> {
    try {
      // Read image file and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      const prompt = `Analyze this image and identify the item shown. Provide:
1. A concise, descriptive name for the item (2-4 words)
2. A brief description (1-2 sentences)
3. 2-5 relevant categories/tags for organizing this item
4. Your confidence level (0-1) in the identification

Format your response as JSON with this structure:
{
  "name": "Item Name",
  "description": "Brief description of the item",
  "suggestedCategories": ["Category1", "Category2", "Category3"],
  "confidence": 0.95
}

Be specific and practical. Focus on what the item is, not artistic descriptions.`;

      const message = new HumanMessage({
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      });

      const response = await this.model.invoke([message]);
      const content = response.content as string;

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const result = JSON.parse(jsonStr);

      return {
        name: result.name || 'Unknown Item',
        description: result.description || '',
        suggestedCategories: result.suggestedCategories || [],
        confidence: result.confidence || 0.5,
      };
    } catch (error) {
      console.error('Error identifying item from image:', error);
      throw new Error('Failed to identify item from image');
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[ext || ''] || 'image/jpeg';
  }

  async semanticLocationSearch(searchQuery: string, allItems: any[]): Promise<any[]> {
    try {
      if (allItems.length === 0) {
        return [];
      }

      // Create a list of all items with their tags
      const itemsData = allItems.map(item => ({
        id: item.id,
        name: item.name,
        location: item.location,
        description: item.description,
        tags: item.tags?.map((t: any) => t.category.name).join(', ') || ''
      }));

      const prompt = `Given the search query "${searchQuery}", find and rank items that match the search criteria.

Items:
${itemsData.map((item, idx) => `${idx + 1}. ID: ${item.id}, Name: ${item.name}, Location: ${item.location}, Tags: ${item.tags || 'none'}`).join('\n')}

MATCHING RULES:
1. Handle typos/speech errors: "kitech"="kitchen", "tabel"="table", "closit"="closet"
2. Search across ALL fields (name, location, AND tags):
   - If searching for "aarushi", return items with "aarushi" in name, location, OR tags
   - Tags are equally important as name and location
3. For location-based searches like "kitchen items" or "items in kitchen":
   - ONLY return items where the location contains the specified place (e.g., "kitchen")
   - Do NOT include items from other locations
4. For specific item name searches (e.g., "cup plate", "laptop"):
   - ONLY return items where the name contains the search terms
   - Be STRICT - if searching for "cup", only return items with "cup" in the name
   - If searching for "cup plate", return items with "cup" OR "plate" in the name
5. For tag-based searches:
   - If searching for a tag name (like "aarushi", "vimal"), match items with that tag
6. Semantic matching: "Rita's kitchen" matches "kitchen", possessive names match base names
7. Rank by relevance: exact matches first, then partial matches

IMPORTANT:
- Be STRICT about matching - don't return items that don't contain the search terms
- Search across name, location, AND tags - all three fields are important
- If searching for "aarushi", return items with "aarushi" in ANY field (name, location, or tags)
- Don't include loosely related items

Return ONLY a JSON array of matching item IDs in ranked order (best first).
Format: ["id1", "id2", "id3"]

If NO items match, return: []`;

      const response = await this.model.invoke(prompt);
      const content = response.content as string;

      console.log('🤖 OpenAI Response:', content);

      // Extract JSON from response
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      console.log('📊 Parsed JSON string:', jsonStr);

      const rankedIds = JSON.parse(jsonStr);
      console.log('🎯 Ranked IDs from AI:', rankedIds);

      // Return items in ranked order
      const rankedItems = rankedIds
        .map((id: string) => allItems.find(item => item.id === id))
        .filter(Boolean);

      // Filter out items that truly don't match if AI returns too many
      if (rankedItems.length === allItems.length && searchQuery.includes('kitchen')) {
        console.log('⚠️  AI returned all items, applying manual filter');
        return rankedItems.filter(item =>
          item.location.toLowerCase().includes('kitchen')
        );
      }

      return rankedItems;
    } catch (error) {
      console.error('Error in semantic location search:', error);
      // Fallback to basic string matching
      const searchLower = searchQuery.toLowerCase();
      const searchTerms = searchLower.replace(/\s+items?/g, '').trim();

      return allItems.filter(item => {
        const itemTags = item.tags?.map((t: any) => t.category.name.toLowerCase()).join(' ') || '';
        return (
          item.location.toLowerCase().includes(searchTerms) ||
          item.name.toLowerCase().includes(searchTerms) ||
          itemTags.includes(searchTerms)
        );
      });
    }
  }
}
