
export type Property = {
    id: string;
    original_url: string;
    title: string;
    original_title: string;
    description: string;
    original_description: string;
    enhanced_title: string;
    enhanced_description: string;
    price: string;
    location: string;
    bedrooms: number;
    bathrooms: number;
    area: string;
    property_type: string;
    image_url: string;
    image_urls: string[];
    scraped_at: string;
    mortgage: string;
    neighborhood: string;
    what_do: string;
    city: string;
    county: string;
    tenant_type: string;
    rental_timing: string;
    furnish_type: string;
    floor_number: number;
    features: string[];
    terms_and_condition: string;
    page_link: string;
    matterportLink: string;

    validated_information: string;
    building_information: string;
    permit_number: string;
    ded_license_number: string;
    rera_registration_number: string;
    reference_id: string;
    dld_brn: string;
    listed_by_name: string;
    listed_by_phone: string;
    listed_by_email: string;
};

export type HistoryEntry = {
    id: string;
    type: 'URL' | 'HTML' | 'BULK';
    details: string;
    propertyCount: number;
    date: string;
};
