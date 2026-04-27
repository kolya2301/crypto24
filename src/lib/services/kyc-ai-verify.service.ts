import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a KYC document verification assistant. Analyze identity document images (Israeli ID cards or passports), extract data, and compare with expected values. Always respond with valid JSON only — no other text.`;

export interface AiVerifyResult {
  passed: boolean;
  idNumberMatch: boolean;
  dobMatch: boolean;
  isValidDocument: boolean;
  notes: string;
  extractedIdNumber?: string;
  extractedDob?: string;
}

export async function verifyKycDocument(params: {
  images: { buffer: Buffer; mimeType: string }[];
  expectedIdNumber: string;
  expectedDateOfBirth: string;
}): Promise<AiVerifyResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const imageContent = params.images.map(img => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      data: img.buffer.toString('base64'),
    },
  }));

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `Verify this identity document against the following expected values:
- ID Number: ${params.expectedIdNumber}
- Date of Birth: ${params.expectedDateOfBirth}

Respond with this JSON structure only:
{
  "idNumberMatch": boolean,
  "dobMatch": boolean,
  "isValidDocument": boolean,
  "extractedIdNumber": "string or null",
  "extractedDob": "string or null",
  "notes": "any issues"
}`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch?.[0] ?? '{}');
    return {
      passed: result.idNumberMatch === true && result.dobMatch === true && result.isValidDocument === true,
      idNumberMatch: result.idNumberMatch ?? false,
      dobMatch: result.dobMatch ?? false,
      isValidDocument: result.isValidDocument ?? false,
      notes: result.notes ?? '',
      extractedIdNumber: result.extractedIdNumber ?? undefined,
      extractedDob: result.extractedDob ?? undefined,
    };
  } catch {
    return {
      passed: false,
      idNumberMatch: false,
      dobMatch: false,
      isValidDocument: false,
      notes: 'Failed to parse AI response',
    };
  }
}
