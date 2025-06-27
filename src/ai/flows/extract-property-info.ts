
'use server';
/**
 * @fileOverview A Genkit flow to extract property information from HTML.
 *
 * - extractPropertyInfo - Extracts structured property data from HTML content.
 * - ExtractPropertyInfoInput - The input type for the extractPropertyInfo function.
 * - ExtractPropertyInfoOutput - The return type for the extractPropertyInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractedPropertySchema = z.object({
  title: z.string().describe('The main title of the property listing.'),
  description: z.string().describe('A detailed description of the property.'),
  price: z.string().describe('The listing price of the property.'),
  location: z.string().describe('The address or general location of the property.'),
  bedrooms: z.number().describe('The number of bedrooms.'),
  bathrooms: z.number().describe('The number of bathrooms.'),
  area: z.string().describe('The total area of the property (e.g., "2,500 sqft").'),
  property_type: z.string().describe('The type of property (e.g., House, Apartment).'),
  image_urls: z.array(z.string()).describe('A list of URLs to all primary images of the property.'),
  mortgage: z.string().describe('Mortgage information, if available.'),
  neighborhood: z.string().describe('The neighborhood where the property is located.'),
  what_do: z.string().describe('The purpose of the listing (e.g., For Rent, For Sale).'),
  city: z.string().describe('The city where the property is located.'),
  county: z.string().describe('The county where the property is located.'),
  tenant_type: z.string().describe('The preferred tenant type (e.g., Family, Bachelor).'),
  rental_timing: z.string().describe('The timing for rental (e.g., Immediately, Flexible).'),
  furnish_type: z.string().describe('The furnishing status (e.g., Furnished, Unfurnished).'),
  floor_number: z.number().describe('The floor number of the property.'),
  features: z.array(z.string()).describe('A list of key features or amenities.'),
  terms_and_condition: z.string().describe('Any terms and conditions mentioned in the listing.'),
  page_link: z.string().describe('The direct link to the property details page.'),

  validated_information: z.string().describe('Any information marked as "Validated" or "Verified".'),
  building_information: z.string().describe('Details about the building the property is in.'),
  permit_number: z.string().describe('The official permit number for the listing or construction.'),
  ded_license_number: z.string().describe('The DED (Department of Economic Development) license number.'),
  rera_registration_number: z.string().describe('The RERA (Real Estate Regulatory Agency) registration number.'),
  reference_id: z.string().describe('The unique reference ID or listing number for the property.'),
  dld_brn: z.string().describe('The DLD (Dubai Land Department) BRN (Broker Registration Number).'),
  listed_by_name: z.string().describe('The name of the person or agency listing the property.'),
  listed_by_phone: z.string().describe('The contact phone number for the listing.'),
  listed_by_email: z.string().describe('The contact email address for the listing.'),
});

const ExtractPropertyInfoInputSchema = z.object({
  htmlContent: z.string().describe('The full HTML content of a property listing page.'),
});
export type ExtractPropertyInfoInput = z.infer<typeof ExtractPropertyInfoInputSchema>;

const ExtractPropertyInfoOutputSchema = z.object({
  properties: z.array(ExtractedPropertySchema).describe('An array of properties found on the page.'),
});
export type ExtractPropertyInfoOutput = z.infer<typeof ExtractPropertyInfoOutputSchema>;


export async function extractPropertyInfo(
  input: ExtractPropertyInfoInput
): Promise<ExtractPropertyInfoOutput> {
  return extractPropertyInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractPropertyInfoPrompt',
  input: {schema: ExtractPropertyInfoInputSchema},
  output: {schema: ExtractPropertyInfoOutputSchema},
  prompt: `You are an expert at extracting structured data from web pages. Analyze the following HTML content from a real estate website and extract the details for all properties listed on the page.

Your goal is to populate all fields in the provided JSON schema.

**CRITICAL INSTRUCTIONS FOR IMAGE EXTRACTION:**
- Find all relevant, high-quality image URLs for the property. Be thorough.
- Look for images in these common patterns:
  - Standard \`<img>\` tags. Check \`src\`, but also prioritize \`data-src\`, \`data-original\`, or \`data-lazy-src\` for lazy-loaded images.
  - Responsive images inside \`<picture>\` tags. Look for \`<source>\` elements and their \`srcset\` attributes. Grab the highest resolution URL if multiple are present.
  - Images set as CSS backgrounds on \`<div>\` or other elements. Look for \`style="background-image: url(...)"\`.
  - Images within gallery or slider components. These might be in elements with classes like \`.gallery\`, \`.slider\`, \`.carousel\`, or have attributes like \`data-slick-index\`.
- Ensure all extracted image URLs are absolute URLs (i.e., they start with http or https). If you find relative URLs (e.g., '/images/prop.jpg'), you MUST convert them to absolute URLs. You can usually infer the base domain from other absolute links on the page.
- Exclude any placeholder images. These often contain words like 'placeholder', 'default', or dimensions like '600x400' in the URL itself.
- For 'image_urls', if you cannot find ANY images after trying all the methods above, return an empty array [].

- For all string fields, if you cannot find the information, return an empty string "".
- For all number fields, if you cannot find the information, return 0.
- For all array fields (like 'features'), if no information is found, return an empty array [].
- Extract contact details like phone numbers and emails for the listed person or agency.

HTML Content:
\`\`\`html
{{{htmlContent}}}
\`\`\`

Extract the property information and return it in the specified JSON format. If no properties are found, return an empty array for the 'properties' field.`,
});

const extractPropertyInfoFlow = ai.defineFlow(
  {
    name: 'extractPropertyInfoFlow',
    inputSchema: ExtractPropertyInfoInputSchema,
    outputSchema: ExtractPropertyInfoOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output ?? { properties: [] };
    } catch (error) {
      console.error("Error during AI-powered property extraction:", error);
      // Return an empty object to prevent the entire scraping process from failing
      // if the AI model returns malformed data.
      return { properties: [] };
    }
  }
);
