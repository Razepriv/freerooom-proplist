import { type Property } from '@/lib/types';

// Phone number extraction utilities
export interface ExtractedContact {
  phones: string[];
  emails: string[];
  names: string[];
}

export function extractPhoneNumbers(text: string): string[] {
  if (!text) return [];
  
  // Multiple phone number patterns
  const patterns = [
    // International format with country code
    /\+\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}/g,
    // US format (xxx) xxx-xxxx
    /\(\d{3}\)\s?\d{3}[-\s]?\d{4}/g,
    // Simple format xxx-xxx-xxxx or xxx.xxx.xxxx
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,
    // International format without +
    /\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}/g,
    // UAE format (common in property listings)
    /05\d[\s-]?\d{3}[\s-]?\d{4}/g,
  ];

  const phones = new Set<string>();
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up the phone number
        const cleaned = match.replace(/[^\d+]/g, '');
        if (cleaned.length >= 7) { // Minimum phone number length
          phones.add(match.trim());
        }
      });
    }
  });

  return Array.from(phones);
}

export function extractEmails(text: string): string[] {
  if (!text) return [];
  
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailPattern);
  return matches ? [...new Set(matches)] : [];
}

export function extractAgentNames(text: string): string[] {
  if (!text) return [];
  
  const patterns = [
    /Listed by[:\s]+([A-Za-z\s]+)/gi,
    /Agent[:\s]+([A-Za-z\s]+)/gi,
    /Contact[:\s]+([A-Za-z\s]+)/gi,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+Khan|\s+Ahmed|\s+Ali|\s+Mohammad)/gi, // Common names in UAE
  ];

  const names = new Set<string>();
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const name = match.replace(/Listed by[:\s]+|Agent[:\s]+|Contact[:\s]+/gi, '').trim();
        if (name.length > 2 && name.length < 50) {
          names.add(name);
        }
      });
    }
  });

  return Array.from(names);
}

export function extractContactInfo(property: Property): ExtractedContact {
  const fullText = [
    property.description,
    property.original_description,
    property.terms_and_condition,
    property.listed_by_name,
    property.listed_by_phone,
    property.listed_by_email,
  ].filter(Boolean).join(' ');

  return {
    phones: extractPhoneNumbers(fullText),
    emails: extractEmails(fullText),
    names: extractAgentNames(fullText),
  };
}

export async function extractContactsFromAllProperties(): Promise<{
  property: Property;
  contacts: ExtractedContact;
}[]> {
  const { getDb } = await import('@/lib/db');
  const properties = await getDb();
  
  return properties.map(property => ({
    property,
    contacts: extractContactInfo(property)
  })).filter(item => 
    item.contacts.phones.length > 0 || 
    item.contacts.emails.length > 0 || 
    item.contacts.names.length > 0
  );
}

export async function updatePropertyWithExtractedContacts(propertyId: string): Promise<Property | null> {
  const { getDb, updatePropertyInDb } = await import('@/lib/db');
  const properties = await getDb();
  const property = properties.find(p => p.id === propertyId);
  
  if (!property) return null;
  
  const contacts = extractContactInfo(property);
  
  const updatedProperty: Property = {
    ...property,
    listed_by_phone: contacts.phones[0] || property.listed_by_phone,
    listed_by_email: contacts.emails[0] || property.listed_by_email,
    listed_by_name: contacts.names[0] || property.listed_by_name,
  };
  
  await updatePropertyInDb(updatedProperty);
  return updatedProperty;
}

// Server Actions (async functions with "use server")
export async function extractContactsFromAllPropertiesServer(): Promise<{
  property: Property;
  contacts: ExtractedContact;
}[]> {
  "use server";
  return await extractContactsFromAllProperties();
}

export async function updatePropertyWithExtractedContactsServer(propertyId: string): Promise<Property | null> {
  "use server";
  return await updatePropertyWithExtractedContacts(propertyId);
}
