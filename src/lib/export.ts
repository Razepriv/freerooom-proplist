
"use client";

import { saveAs } from 'file-saver';
import { utils, write } from 'xlsx';
import type { Property } from '@/lib/types';

const getAbsoluteUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) {
    return url;
  }
  // This function is client-side, so window should be available.
  if (typeof window !== 'undefined') {
    try {
        return new URL(url, window.location.origin).href;
    } catch (e) {
        return url; // Return original if it's not a valid partial URL
    }
  }
  // Fallback for any edge cases (e.g. server-side rendering context)
  return url; 
};

const createNestedObject = (prop: Property) => {
  return {
    main: {
        id: prop.id,
        title: prop.title,
        price: prop.price,
        description: prop.description,
        property_type: prop.property_type,
        what_do: prop.what_do,
        furnish_type: prop.furnish_type,
        rental_timing: prop.rental_timing,
        tenant_type: prop.tenant_type,
        scraped_at: prop.scraped_at,
        original_url: prop.original_url,
    },
    location: {
        location: prop.location,
        city: prop.city,
        county: prop.county,
        neighborhood: prop.neighborhood,
    },
    property_details: {
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        area: prop.area,
        floor_number: prop.floor_number,
        building_information: prop.building_information,
    },
    features: {
        features: prop.features,
    },
    images: {
        image_url: getAbsoluteUrl(prop.image_url),
        image_urls: prop.image_urls.map(getAbsoluteUrl),
    },
    legal: {
        validated_information: prop.validated_information,
        permit_number: prop.permit_number,
        ded_license_number: prop.ded_license_number,
        rera_registration_number: prop.rera_registration_number,
        dld_brn: prop.dld_brn,
        reference_id: prop.reference_id,
        terms_and_condition: prop.terms_and_condition,
        mortgage: prop.mortgage,
    },
    agent: {
        listed_by_name: prop.listed_by_name,
        listed_by_phone: prop.listed_by_phone,
        listed_by_email: prop.listed_by_email,
    },
    ai_enhancements: {
        enhanced_title: prop.enhanced_title,
        enhanced_description: prop.enhanced_description,
        original_title: prop.original_title,
        original_description: prop.original_description,
    },
    matterport: {
      matterportLink: prop.matterportLink
    }
  };
};

const flattenObject = (obj: any, parentKey = '', result: { [key: string]: any } = {}) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
        flattenObject(obj[key], newKey, result);
      } else if (Array.isArray(obj[key])) {
        result[newKey] = obj[key].join(' | ');
      }
      else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
};


// Function to download data as a JSON file
export const downloadJson = (data: Property[], filename: string) => {
  const preparedData = data.map(createNestedObject);
  const jsonString = JSON.stringify(preparedData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  saveAs(blob, `${filename}.json`);
};

// Function to download data as a CSV file
export const downloadCsv = (data: Property[], filename:string) => {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }
    
    const csvHeaders = [
        'Title', 'Content', 'images', 'Matterport', 'Categories', 'property_a',
        'property_b', 'property_c', 'property_d', 'property_e', 'property_f',
        'property_g', 'property_h', 'property_i', 'property_j', 'property_k',
        'property_l', 'Features', 'Term and Condition'
    ];

    const csvData = data.map(prop => ({
        'Title': prop.title,
        'Content': prop.description,
        'images': (prop.image_urls || []).map(getAbsoluteUrl).join(' | '),
        'Matterport': prop.matterportLink,
        'Categories': prop.what_do,
        'property_a': prop.bedrooms,
        'property_b': prop.bathrooms,
        'property_c': prop.area,
        'property_d': prop.tenant_type,
        'property_e': prop.rental_timing,
        'property_f': prop.furnish_type,
        'property_g': prop.floor_number,
        'property_h': prop.permit_number,
        'property_i': prop.ded_license_number,
        'property_j': prop.rera_registration_number,
        'property_k': prop.dld_brn,
        'property_l': prop.reference_id,
        'Features': (prop.features || []).join(' | '),
        'Term and Condition': prop.terms_and_condition,
    }));

    const worksheet = utils.json_to_sheet(csvData, { header: csvHeaders, skipHeader: false });
    
    // Add the second row with example/condition data
    const secondRow = {
        'Title': 'Property Id',
        'Content': 'Description',
        'images': 'image URL 1 | image URL 2 | ...',
        'Matterport': 'Matterport',
        'Categories': 'Rental type',
        'property_a': 'Beds property',
        'property_b': 'Baths property',
        'property_c': 'Sqft property',
        'property_d': 'Tenant Type',
        'property_e': 'Rental Period',
        'property_f': 'Furnish type',
        'property_g': 'Floor number',
        'property_h': 'DLD permit number',
        'property_i': 'DED license number',
        'property_j': 'Rera registration number',
        'property_k': 'DLD BRN',
        'property_l': 'Reference Id',
        'Features': 'Take them with the | pipe SEPERATED',
        'Term and Condition': 'Term and Condition (Check on website and update)',
    };
    const secondRowArray = csvHeaders.map(header => secondRow[header as keyof typeof secondRow] || '');
    utils.sheet_add_aoa(worksheet, [secondRowArray], { origin: 'A2' });

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Properties');

    // Generate CSV output
    const csvOutput = write(workbook, { bookType: 'csv', type: 'string' });
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
};

// Function to download data as an Excel file
export const downloadExcel = (data: Property[], filename: string) => {
  const flattenedData = data.map(prop => flattenObject(createNestedObject(prop)));

    if (flattenedData.length === 0) {
        alert("No data to export.");
        return;
    }
  
  const worksheet = utils.json_to_sheet(flattenedData);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Properties');

  // Generate XLSX output
  const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(blob, `${filename}.xlsx`);
};
