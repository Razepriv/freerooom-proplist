'use server';

/**
 * @fileOverview This file defines a Genkit flow for enhancing property descriptions and titles using AI.
 *
 * - enhancePropertyContent - A function that takes a property description and title and returns an enhanced version.
 * - EnhancePropertyContentInput - The input type for the enhancePropertyContent function.
 * - EnhancePropertyContentOutput - The return type for the enhancePropertyContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhancePropertyContentInputSchema = z.object({
  title: z.string().describe('The original property title.'),
  description: z
    .string()
    .describe('The original property description to be enhanced.'),
});
export type EnhancePropertyContentInput = z.infer<
  typeof EnhancePropertyContentInputSchema
>;

const EnhancePropertyContentOutputSchema = z.object({
  enhancedTitle: z
    .string()
    .describe('The enhanced property title generated by the AI.'),
  enhancedDescription: z
    .string()
    .describe('The enhanced property description generated by the AI.'),
});
export type EnhancePropertyContentOutput = z.infer<
  typeof EnhancePropertyContentOutputSchema
>;

export async function enhancePropertyContent(
  input: EnhancePropertyContentInput
): Promise<EnhancePropertyContentOutput> {
  return enhancePropertyContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'enhancePropertyContentPrompt',
  input: {schema: EnhancePropertyContentInputSchema},
  output: {schema: EnhancePropertyContentOutputSchema},
  prompt: `You are an expert real estate copywriter. Your goal is to enhance a property title and description to make them more engaging and appealing to potential buyers.

Rewrite the following content and return it in the specified JSON format.

Original Title: {{{title}}}
Original Description: {{{description}}}`,
});

const enhancePropertyContentFlow = ai.defineFlow(
  {
    name: 'enhancePropertyContentFlow',
    inputSchema: EnhancePropertyContentInputSchema,
    outputSchema: EnhancePropertyContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // If enhancement fails, return the original content wrapped in the output schema
    if (!output) {
      return {
        enhancedTitle: input.title,
        enhancedDescription: input.description,
      };
    }
    return output;
  }
);
