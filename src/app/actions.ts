"use server";

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { enhancePropertyContent } from '@/ai/flows/enhance-property-description';
import { extractPropertyInfo } from '@/ai/flows/extract-property-info';
import { savePropertiesToDb, saveHistoryEntry, updatePropertyInDb, deletePropertyFromDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { type Property, type HistoryEntry } from '@/lib/types';


// Helper function to download an image from a URL and save it locally
async function downloadImage(url: string, propertyId: string, imageIndex: number): Promise<string | null> {
    if (!url || !url.startsWith('http')) {
        console.error(`❌ Invalid or relative URL provided for download: ${url}`);
        return null;
    }

    const publicDir = path.join(process.cwd(), 'public');
    const propertyDir = path.join(publicDir, 'uploads', 'properties', propertyId);
    
    try {
        await fs.mkdir(propertyDir, { recursive: true });
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': new URL(url).origin, // Add referer header to mimic browser request
            },
            redirect: 'follow', // Follow redirects
        });
        
        if (!response.ok) {
            console.error(`❌ Failed to fetch image ${url}: ${response.status} ${response.statusText}`);
            return null;
        }

        const contentType = response.headers.get('content-type');
        const extension = contentType ? contentType.split('/')[1] : 'jpg';
        const filename = `${uuidv4()}.${extension}`;
        const filepath = path.join(propertyDir, filename);

        const arrayBuffer = await response.arrayBuffer();
        await fs.writeFile(filepath, Buffer.from(arrayBuffer));
        
        const serverUrl = `/uploads/properties/${propertyId}/${filename}`;
        console.log(`✅ Image downloaded and saved: ${serverUrl}`);
        return serverUrl;
    } catch (error) {
        console.error(`❌ Error downloading image ${url}:`, error);
        return null;
    }
}


async function getHtml(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
        if (error instanceof Error) {
            throw new Error(`Could not retrieve content from ${url}. Reason: ${error.message}`);
        }
        throw new Error(`Could not retrieve content from ${url}.`);
    }
}

async function processScrapedData(properties: any[], originalUrl: string, historyEntry: Omit<HistoryEntry, 'id' | 'date' | 'propertyCount'>) {
    const processingPromises = properties.map(async (p, index) => {
        const propertyId = `prop-${Date.now()}-${index}`;
        
        const imageUrls = (p.image_urls && Array.isArray(p.image_urls))
            ? p.image_urls.filter((url: string | null): url is string => !!url)
            : [];
        
        console.log(`[Image Processing] Found ${imageUrls.length} image URLs to process for propertyId: ${propertyId}.`);

        const downloadPromises = imageUrls.map((imgUrl: string, i: number) => downloadImage(imgUrl, propertyId, i));
        const downloadedUrls = (await Promise.all(downloadPromises)).filter((url): url is string => url !== null);
        
        const enhancedContent = await enhancePropertyContent({ title: p.title, description: p.description });

        return {
            ...p,
            id: propertyId,
            original_url: originalUrl,
            original_title: p.title,
            original_description: p.description,
            title: enhancedContent.enhancedTitle || p.title, // Use enhanced as primary
            description: enhancedContent.enhancedDescription || p.description, // Use enhanced as primary
            enhanced_title: enhancedContent.enhancedTitle,
            enhanced_description: enhancedContent.enhancedDescription,
            scraped_at: new Date().toISOString(),
            image_urls: downloadedUrls,
            image_url: downloadedUrls.length > 0 ? downloadedUrls[0] : 'https://placehold.co/600x400.png',
        };
    });

    const finalProperties = await Promise.all(processingPromises);
    
    console.log('Content processing complete.');
    
    await saveHistoryEntry({
        ...historyEntry,
        propertyCount: finalProperties.length,
    });

    revalidatePath('/history');

    return finalProperties;
}


export async function scrapeUrl(url: string): Promise<Property[] | null> {
    console.log(`Scraping URL: ${url}`);

    if (!url || !url.includes('http')) {
        throw new Error('Invalid URL provided.');
    }
    
    const htmlContent = await getHtml(url);
    const result = await extractPropertyInfo({ htmlContent });
    if (!result || !result.properties) {
        console.log("AI extraction returned no properties.");
        return [];
    }
    
    return processScrapedData(result.properties, url, { type: 'URL', details: url });
}

export async function scrapeHtml(html: string, originalUrl: string = 'scraped-from-html'): Promise<Property[] | null> {
    console.log(`Scraping HTML of length: ${html.length}`);

    if (!html || html.length < 100) {
        throw new Error('Invalid HTML provided.');
    }

    const result = await extractPropertyInfo({ htmlContent: html });
    if (!result || !result.properties) {
        console.log("AI extraction returned no properties.");
        return [];
    }
    
    return processScrapedData(result.properties, originalUrl, { type: 'HTML', details: 'Pasted HTML content' });
}

export async function scrapeBulk(urls: string): Promise<Property[] | null> {
    const urlList = urls.split('\n').map(u => u.trim()).filter(Boolean);
    console.log(`Bulk scraping ${urlList.length} URLs.`);

    if (urlList.length === 0) {
        throw new Error('No valid URLs found in bulk input.');
    }
    
    const allResults: Property[] = [];
    for (const url of urlList) {
        try {
            console.log(`Scraping ${url} in bulk...`);
            const htmlContent = await getHtml(url);
            const result = await extractPropertyInfo({ htmlContent });
            if (result && result.properties) {
                const processed = await processScrapedData(result.properties, url, {type: 'BULK', details: `Bulk operation included: ${url}`});
                allResults.push(...processed);
            }
        } catch (error) {
            console.error(`Failed to scrape ${url} during bulk operation:`, error);
        }
    }
    
    return allResults;
}


export async function saveProperty(property: Property) {
    await savePropertiesToDb([property]);
}

export async function updateProperty(property: Property) {
    await updatePropertyInDb(property);
}

export async function deleteProperty(propertyId: string) {
    await deletePropertyFromDb(propertyId);
}

export async function bulkDeleteProperties(propertyIds: string[]) {
    const { bulkDeleteProperties: bulkDelete } = await import('@/lib/db');
    return await bulkDelete(propertyIds);
}

export async function deleteAllProperties() {
    const { deleteAllProperties: deleteAll } = await import('@/lib/db');
    return await deleteAll();
}

export async function deleteFilteredProperties(filter: import('@/lib/db').ExportFilter) {
    const { deleteFilteredProperties: deleteFiltered } = await import('@/lib/db');
    return await deleteFiltered(filter);
}

// Export-related server actions
export async function getFilteredPropertiesAction(filter: import('@/lib/db').ExportFilter) {
    const { getFilteredProperties } = await import('@/lib/db');
    return await getFilteredProperties(filter);
}

export async function getExportStatsAction(filter?: import('@/lib/db').ExportFilter) {
    const { getExportStats } = await import('@/lib/db');
    return await getExportStats(filter);
}

export async function getFilteredHistoryAction(filter?: { startDate?: string; endDate?: string; type?: string }) {
    const { getFilteredHistory } = await import('@/lib/db');
    return await getFilteredHistory(filter);
}

// Contact extraction actions
export async function extractContactsFromAllPropertiesAction() {
    const { extractContactsFromAllPropertiesServer } = await import('@/lib/contact-extraction');
    return await extractContactsFromAllPropertiesServer();
}

export async function updatePropertyWithExtractedContactsAction(propertyId: string) {
    const { updatePropertyWithExtractedContactsServer } = await import('@/lib/contact-extraction');
    return await updatePropertyWithExtractedContactsServer(propertyId);
}
