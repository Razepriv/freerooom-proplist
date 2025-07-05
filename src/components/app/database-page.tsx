"use client";

import { useState, useTransition, useMemo } from 'react';
import { type Property } from '@/lib/types';
import { deleteProperty, updateProperty } from '@/app/actions';
import { DatabaseTable } from '@/components/app/database-table';
import { EditDialog } from '@/components/app/edit-dialog';
import { ExportDialog } from '@/components/app/export-dialog';
import { ContactExtractionDialog } from '@/components/app/contact-extraction-dialog';
import { DashboardStats } from '@/components/app/dashboard-stats';
import { BulkDeleteDialog } from '@/components/app/bulk-delete-dialog';
import { useToast } from "@/hooks/use-toast";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { downloadCsv, downloadJson, downloadExcel } from '@/lib/export';
import { Loader2, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DatabasePageProps {
  initialProperties: Property[];
}

export function DatabasePage({ initialProperties }: DatabasePageProps) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  
  // Add filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all');
  
  const { toast } = useToast();

  // Add filtered properties logic
  const filteredProperties = useMemo(() => {
    let filtered = properties;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(property => 
        property.title.toLowerCase().includes(query) ||
        property.description.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query) ||
        property.city.toLowerCase().includes(query) ||
        property.neighborhood.toLowerCase().includes(query) ||
        property.property_type.toLowerCase().includes(query) ||
        property.price.toLowerCase().includes(query) ||
        property.listed_by_name.toLowerCase().includes(query)
      );
    }

    // Property type filter
    if (selectedPropertyType !== 'all') {
      filtered = filtered.filter(property => 
        property.property_type.toLowerCase() === selectedPropertyType.toLowerCase()
      );
    }

    return filtered;
  }, [properties, searchQuery, selectedPropertyType]);

  // Get unique property types for filter dropdown
  const propertyTypes = useMemo(() => {
    const types = [...new Set(properties.map(p => p.property_type).filter(Boolean))];
    return types.sort();
  }, [properties]);

  const handleDelete = (propertyId: string) => {
    startTransition(async () => {
      try {
        await deleteProperty(propertyId);
        setProperties(prev => prev.filter(p => p.id !== propertyId));
        toast({ title: "Success", description: "Property deleted." });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete property." });
      }
    });
  };

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    setIsEditDialogOpen(true);
  };

  const handleSave = (updatedProperty: Property) => {
    startTransition(async () => {
      try {
        await updateProperty(updatedProperty);
        setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
        toast({ title: "Success", description: "Property updated." });
        setIsEditDialogOpen(false);
        setSelectedProperty(null);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update property." });
      }
    });
  };

  const handlePropertyUpdate = (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
  };

  const handlePropertiesDeleted = (deletedCount: number) => {
    // Refresh the properties from the server since we don't know which ones were deleted
    window.location.reload();
  };

  const handleSelectProperty = (property: Property, selected: boolean) => {
    if (selected) {
      setSelectedProperties(prev => [...prev, property]);
    } else {
      setSelectedProperties(prev => prev.filter(p => p.id !== property.id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedProperties(filteredProperties);
    } else {
      setSelectedProperties([]);
    }
  };

  return (
    <>
      <DashboardStats properties={properties} />
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground mb-2 md:mb-0">
          {filteredProperties.length} of {properties.length} properties
          {filteredProperties.length !== properties.length && (
            <span className="ml-1 text-primary">(filtered)</span>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <ContactExtractionDialog allProperties={properties} onPropertyUpdate={handlePropertyUpdate} />
          <Button variant="outline" onClick={() => downloadJson(filteredProperties, 'database_export')}>Quick JSON</Button>
          <Button variant="outline" onClick={() => downloadCsv(filteredProperties, 'database_export')}>Quick CSV</Button>
          <Button variant="outline" onClick={() => downloadExcel(filteredProperties, 'database_export')}>Quick Excel</Button>
          <ExportDialog allProperties={properties} />
          <BulkDeleteDialog 
            allProperties={properties} 
            selectedProperties={selectedProperties}
            onPropertiesDeleted={handlePropertiesDeleted}
          />
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 border rounded-lg bg-muted/20">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search properties by title, location, type, agent, or price..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select 
            value={selectedPropertyType}
            onValueChange={setSelectedPropertyType}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Property Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Property Types</SelectItem>
              {propertyTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(searchQuery || selectedPropertyType !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSearchQuery('');
              setSelectedPropertyType('all');
            }}
            className="text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>
      {isPending && <div className="flex justify-center items-center my-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      <DatabaseTable 
        properties={filteredProperties} 
        selectedProperties={selectedProperties}
        onDelete={handleDelete} 
        onEdit={handleEdit}
        onSelectProperty={handleSelectProperty}
        onSelectAll={handleSelectAll}
      />
      <EditDialog
        isOpen={isEditDialogOpen}
        property={selectedProperty}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
