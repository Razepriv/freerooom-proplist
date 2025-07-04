"use client";

import { useState, useEffect } from 'react';
import { type Property } from '@/lib/types';
import { type ExportFilter } from '@/lib/db';
import { getFilteredPropertiesAction, getExportStatsAction } from '@/app/actions';
import { downloadFilteredJson, downloadFilteredCsv, downloadFilteredExcel, generateFilteredFilename } from '@/lib/export';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, Info, Calendar, MapPin, Home, DollarSign } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ExportDialogProps {
  allProperties: Property[];
}

export function ExportDialog({ allProperties }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<ExportFilter>({});
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(allProperties);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    updateFilteredData();
  }, [filter, allProperties]);

  const updateFilteredData = async () => {
    setIsLoading(true);
    try {
      const filtered = await getFilteredPropertiesAction(filter);
      const exportStats = await getExportStatsAction(filter);
      setFilteredProperties(filtered);
      setStats(exportStats);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to apply filters." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ExportFilter, value: string | number | undefined) => {
    setFilter(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const getFilterDescription = () => {
    const parts = [];
    if (filter.startDate) parts.push(`From: ${new Date(filter.startDate).toLocaleDateString()}`);
    if (filter.endDate) parts.push(`To: ${new Date(filter.endDate).toLocaleDateString()}`);
    if (filter.propertyType) parts.push(`Type: ${filter.propertyType}`);
    if (filter.location) parts.push(`Location: ${filter.location}`);
    if (filter.minPrice) parts.push(`Min Price: ${filter.minPrice}`);
    if (filter.maxPrice) parts.push(`Max Price: ${filter.maxPrice}`);
    return parts.length > 0 ? parts.join(', ') : 'All properties';
  };

  const handleExport = (format: 'json' | 'csv' | 'excel') => {
    if (filteredProperties.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "No properties match the current filters." });
      return;
    }

    const filterInfo = getFilterDescription();
    const filename = generateFilteredFilename(
      'properties_export',
      filter.startDate,
      filter.endDate,
      filter.propertyType || filter.location
    );

    try {
      switch (format) {
        case 'json':
          downloadFilteredJson(filteredProperties, filename, filterInfo);
          break;
        case 'csv':
          downloadFilteredCsv(filteredProperties, filename, filterInfo);
          break;
        case 'excel':
          downloadFilteredExcel(filteredProperties, filename, filterInfo);
          break;
      }
      toast({ title: "Success", description: `${format.toUpperCase()} export completed!` });
    } catch (error) {
      toast({ variant: "destructive", title: "Export Failed", description: `Failed to export ${format.toUpperCase()} file.` });
    }
  };

  const clearFilters = () => {
    setFilter({});
  };

  const uniquePropertyTypes = [...new Set(allProperties.map(p => p.property_type).filter(Boolean))];
  const uniqueLocations = [...new Set([
    ...allProperties.map(p => p.city).filter(Boolean),
    ...allProperties.map(p => p.county).filter(Boolean),
    ...allProperties.map(p => p.location).filter(Boolean)
  ])];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Download className="h-4 w-4" />
          Advanced Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Properties with Filters
          </DialogTitle>
          <DialogDescription>
            Apply filters to export specific subsets of your property data.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="filters" className="space-y-4">
          <TabsList>
            <TabsTrigger value="filters" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Info className="h-4 w-4" />
              Preview & Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Range Filters */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filter.startDate || ''}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filter.endDate || ''}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Property Type Filter */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Property Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={filter.propertyType || ''} onValueChange={(value) => handleFilterChange('propertyType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All property types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All property types</SelectItem>
                      {uniquePropertyTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Location Filter */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="Search by city, county, or location..."
                    value={filter.location || ''}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {uniqueLocations.slice(0, 6).map(location => (
                      <Badge
                        key={location}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => handleFilterChange('location', location)}
                      >
                        {location}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Price Range Filter */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price Range
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="minPrice">Minimum Price</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      placeholder="0"
                      value={filter.minPrice || ''}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxPrice">Maximum Price</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      placeholder="No limit"
                      value={filter.maxPrice || ''}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
              <div className="text-sm text-muted-foreground">
                {isLoading ? 'Applying filters...' : `${filteredProperties.length} properties match current filters`}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalProperties}</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.filteredProperties} after filters
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Date Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.dateRange ? (
                      <div className="text-sm">
                        <div>From: {new Date(stats.dateRange.earliest).toLocaleDateString()}</div>
                        <div>To: {new Date(stats.dateRange.latest).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No data</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Property Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {Object.entries(stats.propertyTypes).slice(0, 3).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span>{type}</span>
                          <span>{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Filter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {getFilterDescription()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Ready to export {filteredProperties.length} properties
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleExport('json')}
              disabled={filteredProperties.length === 0}
            >
              Export JSON
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleExport('csv')}
              disabled={filteredProperties.length === 0}
            >
              Export CSV
            </Button>
            <Button 
              onClick={() => handleExport('excel')}
              disabled={filteredProperties.length === 0}
            >
              Export Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
