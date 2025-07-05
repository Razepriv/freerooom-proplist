"use client";

import { useState, useTransition } from 'react';
import { type Property } from '@/lib/types';
import { type ExportFilter } from '@/lib/db';
import { bulkDeleteProperties, deleteAllProperties, deleteFilteredProperties } from '@/app/actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Trash2, 
  AlertTriangle, 
  Calendar,
  Filter,
  Home,
  MapPin,
  DollarSign,
  Loader2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface BulkDeleteDialogProps {
  allProperties: Property[];
  selectedProperties?: Property[];
  onPropertiesDeleted: (deletedCount: number) => void;
}

export function BulkDeleteDialog({ 
  allProperties, 
  selectedProperties = [], 
  onPropertiesDeleted 
}: BulkDeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'selected' | 'filtered' | 'all'>('selected');
  const [filter, setFilter] = useState<ExportFilter>({});
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    count: number;
    action: () => void;
  }>({ isOpen: false, title: '', description: '', count: 0, action: () => {} });
  
  const { toast } = useToast();

  const handleFilterChange = (key: keyof ExportFilter, value: string | number | undefined) => {
    setFilter(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const getFilteredCount = () => {
    if (!filter || Object.keys(filter).length === 0) {
      return allProperties.length;
    }

    return allProperties.filter(property => {
      // Date filtering
      if (filter.startDate) {
        const propertyDate = new Date(property.scraped_at);
        const startDate = new Date(filter.startDate);
        if (propertyDate < startDate) return false;
      }
      
      if (filter.endDate) {
        const propertyDate = new Date(property.scraped_at);
        const endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (propertyDate > endDate) return false;
      }

      // Property type filtering
      if (filter.propertyType && property.property_type.toLowerCase() !== filter.propertyType.toLowerCase()) {
        return false;
      }

      // Location filtering
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
        const priceMatch = property.price.match(/[\d,]+/);
        if (priceMatch) {
          const price = parseInt(priceMatch[0].replace(/,/g, ''));
          if (filter.minPrice && price < filter.minPrice) return false;
          if (filter.maxPrice && price > filter.maxPrice) return false;
        }
      }

      return true;
    }).length;
  };

  const handleDeleteSelected = () => {
    if (selectedProperties.length === 0) {
      toast({ variant: "destructive", title: "No properties selected", description: "Please select properties to delete." });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Delete Selected Properties",
      description: `Are you sure you want to delete ${selectedProperties.length} selected properties? This action cannot be undone.`,
      count: selectedProperties.length,
      action: () => {
        startTransition(async () => {
          try {
            const propertyIds = selectedProperties.map(p => p.id);
            const result = await bulkDeleteProperties(propertyIds);
            onPropertiesDeleted(result.deletedCount);
            setIsOpen(false);
            toast({ 
              title: "Properties deleted", 
              description: `Successfully deleted ${result.deletedCount} properties.` 
            });
          } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete properties." });
          }
        });
      }
    });
  };

  const handleDeleteFiltered = () => {
    const count = getFilteredCount();
    if (count === 0) {
      toast({ variant: "destructive", title: "No properties match", description: "No properties match the current filters." });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Delete Filtered Properties",
      description: `Are you sure you want to delete ${count} properties matching the current filters? This action cannot be undone.`,
      count,
      action: () => {
        startTransition(async () => {
          try {
            const result = await deleteFilteredProperties(filter);
            onPropertiesDeleted(result.deletedCount);
            setIsOpen(false);
            toast({ 
              title: "Properties deleted", 
              description: `Successfully deleted ${result.deletedCount} properties. ${result.remainingCount} properties remain.` 
            });
          } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete filtered properties." });
          }
        });
      }
    });
  };

  const handleDeleteAll = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete All Properties",
      description: `Are you sure you want to delete ALL ${allProperties.length} properties? This will completely clear your database. This action cannot be undone.`,
      count: allProperties.length,
      action: () => {
        startTransition(async () => {
          try {
            const deletedCount = await deleteAllProperties();
            onPropertiesDeleted(deletedCount);
            setIsOpen(false);
            toast({ 
              title: "All properties deleted", 
              description: `Successfully deleted all ${deletedCount} properties.` 
            });
          } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete all properties." });
          }
        });
      }
    });
  };

  const uniquePropertyTypes = [...new Set(allProperties.map(p => p.property_type).filter(Boolean))];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Bulk Delete
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Bulk Delete Properties
            </DialogTitle>
            <DialogDescription>
              Choose how you want to delete properties. Images will be preserved in the backend.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-800">
              Images will NOT be deleted from the backend storage. Only property data will be removed.
            </span>
          </div>

          <Tabs value={deleteMode} onValueChange={(value) => setDeleteMode(value as any)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="selected" disabled={selectedProperties.length === 0}>
                Selected ({selectedProperties.length})
              </TabsTrigger>
              <TabsTrigger value="filtered">
                Filtered
              </TabsTrigger>
              <TabsTrigger value="all" className="text-destructive">
                All Properties
              </TabsTrigger>
            </TabsList>

            <TabsContent value="selected" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Delete Selected Properties</CardTitle>
                  <CardDescription>
                    Delete the {selectedProperties.length} currently selected properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedProperties.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedProperties.slice(0, 5).map(prop => (
                          <Badge key={prop.id} variant="outline">
                            {prop.title.substring(0, 30)}...
                          </Badge>
                        ))}
                        {selectedProperties.length > 5 && (
                          <Badge variant="secondary">
                            +{selectedProperties.length - 5} more
                          </Badge>
                        )}
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteSelected}
                        disabled={isPending}
                        className="w-full"
                      >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Delete {selectedProperties.length} Selected Properties
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No properties currently selected</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="filtered" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Delete Filtered Properties</CardTitle>
                  <CardDescription>
                    Apply filters and delete matching properties
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date Range */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date Range
                      </Label>
                      <div className="space-y-2">
                        <Input
                          type="date"
                          placeholder="Start date"
                          value={filter.startDate || ''}
                          onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                        <Input
                          type="date"
                          placeholder="End date"
                          value={filter.endDate || ''}
                          onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Property Type */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Property Type
                      </Label>
                      <Select 
                        value={filter.propertyType || ''} 
                        onValueChange={(value) => handleFilterChange('propertyType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Types</SelectItem>
                          {uniquePropertyTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </Label>
                      <Input
                        placeholder="Search by city, county, or location..."
                        value={filter.location || ''}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                      />
                    </div>

                    {/* Price Range */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Price Range
                      </Label>
                      <div className="space-y-2">
                        <Input
                          type="number"
                          placeholder="Min price"
                          value={filter.minPrice || ''}
                          onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                        <Input
                          type="number"
                          placeholder="Max price"
                          value={filter.maxPrice || ''}
                          onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Properties matching filters:</span>
                    <Badge variant="destructive">{getFilteredCount()}</Badge>
                  </div>

                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteFiltered}
                    disabled={isPending || getFilteredCount() === 0}
                    className="w-full"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Delete {getFilteredCount()} Filtered Properties
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-sm text-destructive">Delete All Properties</CardTitle>
                  <CardDescription>
                    This will permanently delete ALL properties from your database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                      <span className="text-sm">Total properties in database:</span>
                      <Badge variant="destructive">{allProperties.length}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">
                        This action cannot be undone. Your entire property database will be cleared.
                      </span>
                    </div>

                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteAll}
                      disabled={isPending || allProperties.length === 0}
                      className="w-full"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Delete All {allProperties.length} Properties
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={confirmDialog.action}
            >
              Delete {confirmDialog.count} Properties
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
