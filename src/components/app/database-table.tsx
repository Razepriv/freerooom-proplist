
"use client";

import { useState } from 'react';
import { BedDouble, Bath, Square, MapPin, Building, Globe, CheckCircle, FileText, Clock, Users, Sofa, List, Hash, Mail, Phone, User, Award, ShieldCheck, FileKey, Building2, Images, MoreVertical, Trash2, Edit, ExternalLink, Sparkles, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Property } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PropertyImage } from './property-image';
import { PropertyImageGallery } from './property-image-gallery';


interface DatabaseTableProps {
  properties: Property[];
  selectedProperties?: Property[];
  onEdit: (property: Property) => void;
  onDelete: (propertyId: string) => void;
  onSelectProperty?: (property: Property, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
}

interface DetailItemProps {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon: Icon, label, value }) => {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && value === 0)) {
    return null;
  }
  
  const renderValue = () => {
    if (typeof value === 'string' && (value.includes('<p>') || value.includes('<li>'))) {
       return <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: value }} />;
    }
    if (typeof value === 'string' && value.startsWith('http')) {
        return (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
            {value}
            </a>
        );
    }
    return <span className="text-muted-foreground break-all">{String(value)}</span>;
  };
  
  return (
    <div className="flex items-start">
      <Icon className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div>
        <span className="font-semibold">{label}: </span>
        {renderValue()}
      </div>
    </div>
  );
};


export function DatabaseTable({ 
  properties, 
  selectedProperties = [], 
  onEdit, 
  onDelete, 
  onSelectProperty, 
  onSelectAll 
}: DatabaseTableProps) {
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const isPropertySelected = (property: Property) => {
    return selectedProperties.some(p => p.id === property.id);
  };

  const allSelected = properties.length > 0 && properties.every(p => isPropertySelected(p));
  const someSelected = selectedProperties.length > 0 && !allSelected;

  const handleSelectAll = (checked: boolean) => {
    if (onSelectAll) {
      onSelectAll(checked);
    }
  };

  const handleSelectProperty = (property: Property, checked: boolean) => {
    if (onSelectProperty) {
      onSelectProperty(property, checked);
    }
  };

  if (properties.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-muted-foreground">Your database is empty. Scrape some properties and save them to see them here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {onSelectProperty && onSelectAll && (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30 mb-4">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
          />
          <span className="text-sm">
            {selectedProperties.length > 0 
              ? `${selectedProperties.length} properties selected`
              : 'Select all properties'
            }
          </span>
          {selectedProperties.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleSelectAll(false)}
              className="ml-auto"
            >
              Clear selection
            </Button>
          )}
        </div>
      )}
      <Accordion type="single" collapsible className="w-full space-y-3">
        {properties.map((prop) => (
          <AccordionItem value={prop.id} key={prop.id} className="border rounded-lg bg-card overflow-hidden transition-all hover:border-primary/20">
            <AccordionTrigger className="p-4 hover:no-underline [&[data-state=open]>div>div>svg.chevron]:rotate-180">
              <div className="flex items-center justify-between gap-4 w-full text-left">
                  {onSelectProperty && (
                    <Checkbox
                      checked={isPropertySelected(prop)}
                      onCheckedChange={(checked) => handleSelectProperty(prop, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                      className="mr-2"
                    />
                  )}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                      <PropertyImage
                        src={prop.image_url || 'https://placehold.co/600x400.png'}
                        alt={prop.title}
                        className="hidden sm:block w-[120px] h-[80px]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate text-base" title={prop.title}>{prop.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" />
                          {prop.location}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <Badge variant="secondary" className="text-nowrap">{prop.property_type}</Badge>
                          <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-primary/70" /> {prop.bedrooms} beds</span>
                          <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-primary/70" /> {prop.bathrooms} baths</span>
                          <span className="flex items-center gap-1.5"><Square className="h-4 w-4 text-primary/70" /> {prop.area}</span>
                        </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                      <p className="font-semibold text-lg text-primary text-right hidden md:block">{prop.price}</p>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <div 
                              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 w-8 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onSelect={() => onEdit(prop)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              {prop.original_url && prop.original_url.startsWith('http') && (
                                  <DropdownMenuItem onSelect={() => window.open(prop.original_url, '_blank')}>
                                      <ExternalLink className="mr-2 h-4 w-4" /> View Source
                                  </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => setDeleteCandidateId(prop.id)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 text-muted-foreground chevron" />
                  </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="px-4 pb-4 border-t pt-4 bg-muted/50 space-y-6">
                    <p className="font-semibold text-xl text-primary text-right md:hidden">{prop.price}</p>

                    {prop.image_urls && prop.image_urls.length > 0 && (
                        <>
                        <div>
                            <h4 className="font-semibold text-base mb-3 flex items-center gap-2"><Images className="h-4 w-4"/> Image Gallery</h4>
                            <PropertyImageGallery
                                propertyId={prop.id}
                                imageUrls={prop.image_urls}
                                title={prop.title}
                            />
                        </div>
                        <Separator />
                        </>
                    )}

                    <div>
                        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">Property Details</h4>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                            <div className="space-y-3">
                                <DetailItem icon={Building} label="City" value={prop.city} />
                                <DetailItem icon={Globe} label="County" value={prop.county} />
                                <DetailItem icon={MapPin} label="Neighborhood" value={prop.neighborhood} />
                                <DetailItem icon={Hash} label="Floor" value={prop.floor_number} />
                            </div>
                            <div className="space-y-3">
                                <DetailItem icon={CheckCircle} label="For" value={prop.what_do} />
                                <DetailItem icon={Users} label="Tenant Type" value={prop.tenant_type} />
                                <DetailItem icon={Sofa} label="Furnishing" value={prop.furnish_type} />
                                <DetailItem icon={Clock} label="Rental Timing" value={prop.rental_timing} />
                            </div>
                            <div className="space-y-3">
                                <DetailItem icon={Building2} label="Building Info" value={prop.building_information} />
                                <DetailItem icon={FileText} label="Mortgage" value={prop.mortgage} />
                                <DetailItem icon={FileText} label="Terms" value={prop.terms_and_condition} />
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <h4 className="font-semibold text-base mb-3 flex items-center gap-2"><FileKey className="h-4 w-4"/> Listing & Agency Details</h4>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                            <div className="space-y-3">
                                <DetailItem icon={Award} label="Reference ID" value={prop.reference_id} />
                                <DetailItem icon={FileKey} label="Permit Number" value={prop.permit_number} />
                                <DetailItem icon={FileKey} label="DED License" value={prop.ded_license_number} />
                            </div>
                            <div className="space-y-3">
                                <DetailItem icon={FileKey} label="RERA Registration" value={prop.rera_registration_number} />
                                <DetailItem icon={FileKey} label="DLD BRN" value={prop.dld_brn} />
                                <DetailItem icon={ShieldCheck} label="Validated Info" value={prop.validated_information} />
                            </div>
                            {prop.page_link && 
                                <div className="flex items-start">
                                    <Globe className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <span className="font-semibold">Page Link: </span>
                                        <a href={prop.page_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{prop.page_link}</a>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <h4 className="font-semibold text-base mb-3 flex items-center gap-2"><User className="h-4 w-4"/> Agent/Lister Information</h4>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                            <div className="space-y-3">
                                <DetailItem icon={User} label="Listed By" value={prop.listed_by_name} />
                            </div>
                            <div className="space-y-3">
                                <DetailItem icon={Phone} label="Phone" value={prop.listed_by_phone} />
                            </div>
                            <div className="space-y-3">
                                <DetailItem icon={Mail} label="Email" value={prop.listed_by_email} />
                            </div>
                        </div>
                    </div>
                    
                    {prop.features && prop.features.length > 0 && (
                        <>
                        <Separator />
                        <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-base"><List className="h-4 w-4"/> Features & Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                            {prop.features.map((feature, index) => <Badge key={index} variant="outline">{feature}</Badge>)}
                        </div>
                        </div>
                        </>
                    )}

                    {prop.description && (
                        <>
                        <Separator />
                        <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-base">Description</h4>
                        <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: prop.description }} />
                        </div>
                        </>
                    )}

                    <Separator />
                    
                </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
       <AlertDialog open={!!deleteCandidateId} onOpenChange={(open) => !open && setDeleteCandidateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the property
              from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteCandidateId) {
                  onDelete(deleteCandidateId);
                }
                setDeleteCandidateId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
