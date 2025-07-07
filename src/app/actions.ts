"use server";

import { v4 as uuidv4 } from 'uuid';
import { enhancePropertyContent } from '@/ai/flows/enhance-property-description';
import { extractPropertyInfo } from '@/ai/flows/extract-property-info';
import { savePropertiesToDb, saveHistoryEntry, updatePropertyInDb, deletePropertyFromDb } from '@/lib/db';
import { getImageStorage, downloadImageFromUrl } from '@/lib/image-storage';
import { revalidatePath } from 'next/cache';
import { type Property, type HistoryEntry } from '@/lib/types';

// Configuration for auto-enhancement
const AUTO_ENHANCE_ENABLED = process.env.AUTO_ENHANCE_ENABLED !== 'false'; // Default to true
const AUTO_SAVE_ENABLED = process.env.AUTO_SAVE_ENABLED !== 'false'; // Default to true


// Helper function to download an image from a URL and save it using the image storage adapter
async function downloadImage(url: string, propertyId: string, imageIndex: number): Promise<string | null> {
    try {
        const imageData = await downloadImageFromUrl(url);
        if (!imageData) {
            return null;
        }

        const imageStorage = getImageStorage();
        const imageUrl = await imageStorage.uploadImage(
            imageData.buffer, 
            propertyId, 
            imageIndex, 
            imageData.contentType
        );

        return imageUrl;
    } catch (error) {
        console.error(`❌ Error processing image ${url}:`, error);
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
        
        // Auto-enhance if enabled
        let enhancedContent = { enhancedTitle: p.title, enhancedDescription: p.description };
        if (AUTO_ENHANCE_ENABLED) {
            try {
                console.log(`✨ Auto-enhancing property: "${p.title}"`);
                enhancedContent = await enhancePropertyContent({ title: p.title, description: p.description });
                console.log(`✅ Enhanced property title: "${enhancedContent.enhancedTitle}"`);
            } catch (enhanceError) {
                console.warn(`⚠️ Auto-enhancement failed for property "${p.title}":`, enhanceError);
            }
        }

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
    
    // Auto-save to database if enabled
    if (AUTO_SAVE_ENABLED && finalProperties.length > 0) {
        try {
            console.log(`💾 Auto-saving ${finalProperties.length} processed properties...`);
            await savePropertiesToDb(finalProperties);
            console.log(`✅ Auto-saved ${finalProperties.length} properties to database`);
        } catch (saveError) {
            console.error(`❌ Auto-save failed:`, saveError);
            // Don't throw error, just log it - properties are still returned for manual save
        }
    }
    
    await saveHistoryEntry({
        ...historyEntry,
        propertyCount: finalProperties.length,
    });

    revalidatePath('/history');
    revalidatePath('/database'); // Also revalidate database page

    return finalProperties;
}


// Enhanced property processing with auto-enhancement and auto-save
async function processScrapedProperties(
    properties: Property[], 
    source: string, 
    sourceUrl?: string
): Promise<Property[]> {
    if (!properties || properties.length === 0) {
        return [];
    }

    console.log(`🔄 Processing ${properties.length} scraped properties with auto-enhancement...`);
    
    const processedProperties: Property[] = [];
    
    for (const property of properties) {
        try {
            let enhancedProperty = { ...property };
            
            // Auto-enhance title and description if enabled
            if (AUTO_ENHANCE_ENABLED) {
                try {
                    console.log(`✨ Auto-enhancing property: "${property.title}"`);
                    const enhancement = await enhancePropertyContent({
                        title: property.title || property.original_title || '',
                        description: property.description || property.original_description || ''
                    });
                    
                    enhancedProperty.enhanced_title = enhancement.enhancedTitle;
                    enhancedProperty.enhanced_description = enhancement.enhancedDescription;
                    enhancedProperty.title = enhancement.enhancedTitle; // Use enhanced as primary title
                    enhancedProperty.description = enhancement.enhancedDescription; // Use enhanced as primary description
                    
                    console.log(`✅ Enhanced property title: "${enhancement.enhancedTitle}"`);
                } catch (enhanceError) {
                    console.warn(`⚠️ Auto-enhancement failed for property "${property.title}":`, enhanceError);
                    // Keep original values if enhancement fails
                    enhancedProperty.enhanced_title = property.title || property.original_title || '';
                    enhancedProperty.enhanced_description = property.description || property.original_description || '';
                }
            }
            
            processedProperties.push(enhancedProperty);
            
        } catch (error) {
            console.error(`❌ Error processing property "${property.title}":`, error);
            // Add the property without enhancement if processing fails
            processedProperties.push(property);
        }
    }
    
    // Auto-save to database if enabled
    if (AUTO_SAVE_ENABLED && processedProperties.length > 0) {
        try {
            console.log(`💾 Auto-saving ${processedProperties.length} processed properties...`);
            await savePropertiesToDb(processedProperties);
            
            // Log to history
            await saveHistoryEntry({
                type: 'URL', // Default type, will be overridden by specific scraping methods
                details: `Auto-scraped and saved ${processedProperties.length} properties from ${source}${sourceUrl ? ` (${sourceUrl})` : ''}`,
                propertyCount: processedProperties.length
            });
            
            console.log(`✅ Auto-saved ${processedProperties.length} properties to database`);
        } catch (saveError) {
            console.error(`❌ Auto-save failed:`, saveError);
            // Don't throw error, just log it - properties are still returned for manual save
        }
    }
    
    return processedProperties;
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
    console.log('🔍 saveProperty called with:', {
        id: property.id,
        title: property.title,
        url: property.original_url
    });
    
    try {
        console.log('💾 Attempting to save property to database...');
        await savePropertiesToDb([property]);
        console.log('✅ Property saved successfully');
        return { success: true, message: "Property saved successfully" };
    } catch (error) {
        console.error("❌ Error saving property:", error);
        if (error instanceof Error) {
            if (error.message.includes("already exist")) {
                return { success: false, message: "This property already exists in the database" };
            }
            return { success: false, message: error.message };
        }
        return { success: false, message: "Failed to save property to database" };
    }
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

export async function checkPropertyExists(property: Property): Promise<boolean> {
    console.log('🔍 Checking if property exists:', {
        id: property.id,
        title: property.title,
        url: property.original_url
    });
    
    try {
        const { getDb } = await import('@/lib/db');
        const existingProperties = await getDb();
        
        // Use same duplicate detection logic as savePropertiesToDb
        const existingKeys = new Set<string>();
        existingProperties.forEach(p => {
            existingKeys.add(`${p.original_url}::${p.original_title}`);
            const locationKey = `${p.location}::${p.price}::${p.bedrooms}::${p.bathrooms}`;
            existingKeys.add(locationKey);
            if (p.enhanced_title) {
                existingKeys.add(`enhanced::${p.enhanced_title.substring(0, 50).toLowerCase()}`);
            }
            if (p.original_title) {
                existingKeys.add(`original::${p.original_title.substring(0, 50).toLowerCase()}`);
            }
            if (p.reference_id) {
                existingKeys.add(`ref::${p.reference_id}`);
            }
            if (p.permit_number) {
                existingKeys.add(`permit::${p.permit_number}`);
            }
        });

        // Check if property would be considered a duplicate
        if (property.original_url === 'scraped-from-html') {
            const locationKey = `${property.location}::${property.price}::${property.bedrooms}::${property.bathrooms}`;
            const enhancedTitleKey = property.enhanced_title ? `enhanced::${property.enhanced_title.substring(0, 50).toLowerCase()}` : null;
            const originalTitleKey = property.original_title ? `original::${property.original_title.substring(0, 50).toLowerCase()}` : null;
            const refKey = property.reference_id ? `ref::${property.reference_id}` : null;
            const permitKey = property.permit_number ? `permit::${property.permit_number}` : null;
            
            return existingKeys.has(locationKey) || 
                   (enhancedTitleKey !== null && existingKeys.has(enhancedTitleKey)) ||
                   (originalTitleKey !== null && existingKeys.has(originalTitleKey)) ||
                   (refKey !== null && existingKeys.has(refKey)) ||
                   (permitKey !== null && existingKeys.has(permitKey));
        } else {
            const originalKey = `${property.original_url}::${property.original_title}`;
            if (existingKeys.has(originalKey)) {
                return true;
            }
            
            const locationKey = `${property.location}::${property.price}::${property.bedrooms}::${property.bathrooms}`;
            const refKey = property.reference_id ? `ref::${property.reference_id}` : null;
            const permitKey = property.permit_number ? `permit::${property.permit_number}` : null;
            
            return existingKeys.has(locationKey) || 
                   (refKey !== null && existingKeys.has(refKey)) ||
                   (permitKey !== null && existingKeys.has(permitKey));
        }
    } catch (error) {
        console.error("❌ Error checking if property exists:", error);
        return false; // If we can't check, assume it doesn't exist
    }
}
