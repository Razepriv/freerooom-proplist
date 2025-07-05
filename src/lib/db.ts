'use server';

import { type Property, type HistoryEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getDatabase } from '@/lib/database-adapter';

// Get database instance
const database = getDatabase();

export async function getDb(): Promise<Property[]> {
    return await database.getAllProperties();
}

export async function getHistory(): Promise<HistoryEntry[]> {
    return await database.getAllHistory();
}

export async function savePropertiesToDb(newProperties: Property[]): Promise<void> {
    const existingProperties = await database.getAllProperties();
    
    // Create multiple keys for more comprehensive duplicate detection
    const existingKeys = new Set<string>();
    existingProperties.forEach(p => {
        // Original method - URL + title combination
        existingKeys.add(`${p.original_url}::${p.original_title}`);
        
        // Enhanced duplicate detection methods
        // 1. Location + price + bedrooms + bathrooms combination
        const locationKey = `${p.location}::${p.price}::${p.bedrooms}::${p.bathrooms}`;
        existingKeys.add(locationKey);
        
        // 2. Enhanced title similarity (first 50 chars)
        if (p.enhanced_title) {
            existingKeys.add(`enhanced::${p.enhanced_title.substring(0, 50).toLowerCase()}`);
        }
        
        // 3. Original title similarity (first 50 chars)
        if (p.original_title) {
            existingKeys.add(`original::${p.original_title.substring(0, 50).toLowerCase()}`);
        }
        
        // 4. Reference ID or permit number if available
        if (p.reference_id) {
            existingKeys.add(`ref::${p.reference_id}`);
        }
        if (p.permit_number) {
            existingKeys.add(`permit::${p.permit_number}`);
        }
    });

    const uniqueNewProperties = newProperties.filter(p => {
        // A generic URL for HTML scrapes means we can't effectively check for duplicates via URL, so check other methods
        if (p.original_url === 'scraped-from-html') {
            // For HTML scrapes, use enhanced duplicate detection
            const locationKey = `${p.location}::${p.price}::${p.bedrooms}::${p.bathrooms}`;
            const enhancedTitleKey = p.enhanced_title ? `enhanced::${p.enhanced_title.substring(0, 50).toLowerCase()}` : null;
            const originalTitleKey = p.original_title ? `original::${p.original_title.substring(0, 50).toLowerCase()}` : null;
            const refKey = p.reference_id ? `ref::${p.reference_id}` : null;
            const permitKey = p.permit_number ? `permit::${p.permit_number}` : null;
            
            // Check if any of these keys already exist
            if (existingKeys.has(locationKey) || 
                (enhancedTitleKey && existingKeys.has(enhancedTitleKey)) ||
                (originalTitleKey && existingKeys.has(originalTitleKey)) ||
                (refKey && existingKeys.has(refKey)) ||
                (permitKey && existingKeys.has(permitKey))) {
                console.log(`Skipping duplicate property (HTML scrape): "${p.original_title}" - matched existing property`);
                return false;
            }
            return true;
        }
        
        // For URL scrapes, use original method plus enhanced detection
        const originalKey = `${p.original_url}::${p.original_title}`;
        if (existingKeys.has(originalKey)) {
            console.log(`Skipping duplicate property: "${p.original_title}" from ${p.original_url}`);
            return false;
        }
        
        // Additional checks for URL scrapes
        const locationKey = `${p.location}::${p.price}::${p.bedrooms}::${p.bathrooms}`;
        const refKey = p.reference_id ? `ref::${p.reference_id}` : null;
        const permitKey = p.permit_number ? `permit::${p.permit_number}` : null;
        
        if (existingKeys.has(locationKey) || 
            (refKey && existingKeys.has(refKey)) ||
            (permitKey && existingKeys.has(permitKey))) {
            console.log(`Skipping duplicate property (alternate match): "${p.original_title}" from ${p.original_url}`);
            return false;
        }
        
        return true;
    });

    if (newProperties.length > 0 && uniqueNewProperties.length === 0) {
       throw new Error("All properties already exist in the database.");
    }
    
    if (uniqueNewProperties.length === 0) {
        console.log("No new properties to save.");
        return; // Nothing to do
    }

    console.log(`Saving ${uniqueNewProperties.length} new properties out of ${newProperties.length} processed properties.`);
    const updatedProperties = [...uniqueNewProperties, ...existingProperties];
    await database.saveProperties(updatedProperties);
    revalidatePath('/database');
}


export async function updatePropertyInDb(updatedProperty: Property): Promise<void> {
    await database.updateProperty(updatedProperty);
    revalidatePath('/database');
}


export async function deletePropertyFromDb(propertyId: string): Promise<void> {
    await database.deleteProperty(propertyId);
    revalidatePath('/database');
}

export async function bulkDeleteProperties(propertyIds: string[]): Promise<{ deletedCount: number; notFoundCount: number }> {
    return await database.bulkDeleteProperties(propertyIds);
}

export async function deleteAllProperties(): Promise<number> {
    const properties = await database.getAllProperties();
    const count = properties.length;
    
    await database.saveProperties([]);
    revalidatePath('/database');
    
    return count;
}

export async function deleteFilteredProperties(filter: ExportFilter): Promise<{ deletedCount: number; remainingCount: number }> {
    const allProperties = await database.getAllProperties();
    const filteredProperties = await getFilteredProperties(filter);
    const filteredIds = new Set(filteredProperties.map(p => p.id));
    
    const remainingProperties = allProperties.filter(p => !filteredIds.has(p.id));
    const deletedCount = allProperties.length - remainingProperties.length;
    
    await database.saveProperties(remainingProperties);
    revalidatePath('/database');
    
    return { deletedCount, remainingCount: remainingProperties.length };
}

export async function saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'date'>): Promise<void> {
    await database.saveHistoryEntry(entry);
    revalidatePath('/history');
}

export async function clearDb(): Promise<void> {
    await database.saveProperties([]);
    revalidatePath('/database');
}

export async function clearHistory(): Promise<void> {
    await database.clearHistory();
    revalidatePath('/history');
}

// Export functionality with date filtering

export interface ExportFilter {
    startDate?: string; // ISO date string
    endDate?: string;   // ISO date string
    propertyType?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
}

export async function getFilteredProperties(filter?: ExportFilter): Promise<Property[]> {
    const properties = await database.getAllProperties();
    
    if (!filter) {
        return properties;
    }

    const filteredResults = properties.filter(property => {
        // Date filtering based on scraped_at
        if (filter.startDate) {
            const propertyDate = new Date(property.scraped_at);
            const startDate = new Date(filter.startDate);
            if (propertyDate < startDate) return false;
        }
        
        if (filter.endDate) {
            const propertyDate = new Date(property.scraped_at);
            const endDate = new Date(filter.endDate);
            // Set end date to end of day
            endDate.setHours(23, 59, 59, 999);
            if (propertyDate > endDate) return false;
        }

        // Property type filtering
        if (filter.propertyType && property.property_type.toLowerCase() !== filter.propertyType.toLowerCase()) {
            return false;
        }

        // Location filtering (city, county, or location field)
        if (filter.location) {
            const searchLocation = filter.location.toLowerCase();
            const locationMatch = 
                property.location.toLowerCase().includes(searchLocation) ||
                property.city.toLowerCase().includes(searchLocation) ||
                property.county.toLowerCase().includes(searchLocation) ||
                property.neighborhood.toLowerCase().includes(searchLocation);
            if (!locationMatch) return false;
        }

        // Price filtering
        if (filter.minPrice || filter.maxPrice) {
            // Extract numeric value from price string
            const priceMatch = property.price.match(/[\d,]+/);
            if (priceMatch) {
                const price = parseInt(priceMatch[0].replace(/,/g, ''));
                if (filter.minPrice && price < filter.minPrice) return false;
                if (filter.maxPrice && price > filter.maxPrice) return false;
            }
        }

        return true;
    });
    
    return filteredResults;
}

export async function getFilteredHistory(filter?: { startDate?: string; endDate?: string; type?: string }): Promise<HistoryEntry[]> {
    const history = await database.getAllHistory();
    
    if (!filter) {
        return history;
    }

    return history.filter(entry => {
        // Date filtering
        if (filter.startDate) {
            const entryDate = new Date(entry.date);
            const startDate = new Date(filter.startDate);
            if (entryDate < startDate) return false;
        }
        
        if (filter.endDate) {
            const entryDate = new Date(entry.date);
            const endDate = new Date(filter.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (entryDate > endDate) return false;
        }

        // Type filtering
        if (filter.type && entry.type !== filter.type) {
            return false;
        }

        return true;
    });
}

// Export statistics function
export async function getExportStats(filter?: ExportFilter): Promise<{
    totalProperties: number;
    filteredProperties: number;
    dateRange: { earliest: string; latest: string } | null;
    propertyTypes: { [key: string]: number };
    locations: { [key: string]: number };
}> {
    const allProperties = await database.getAllProperties();
    const filteredProperties = await getFilteredProperties(filter);

    // Calculate date range
    let dateRange = null;
    if (allProperties.length > 0) {
        const dates = allProperties.map(p => new Date(p.scraped_at)).sort((a, b) => a.getTime() - b.getTime());
        dateRange = {
            earliest: dates[0].toISOString(),
            latest: dates[dates.length - 1].toISOString()
        };
    }

    // Calculate property types distribution
    const propertyTypes: { [key: string]: number } = {};
    filteredProperties.forEach(p => {
        const type = p.property_type || 'Unknown';
        propertyTypes[type] = (propertyTypes[type] || 0) + 1;
    });

    // Calculate locations distribution
    const locations: { [key: string]: number } = {};
    filteredProperties.forEach(p => {
        const location = p.city || p.location || 'Unknown';
        locations[location] = (locations[location] || 0) + 1;
    });

    return {
        totalProperties: allProperties.length,
        filteredProperties: filteredProperties.length,
        dateRange,
        propertyTypes,
        locations
    };
}
