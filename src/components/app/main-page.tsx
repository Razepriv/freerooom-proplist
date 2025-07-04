"use client";

import { useState, useTransition, useCallback, ChangeEvent, DragEvent, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ArrowRight, Loader2, Trash2, UploadCloud, Search, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { scrapeUrl, scrapeHtml, scrapeBulk, saveProperty } from '@/app/actions';
import { type Property } from '@/lib/types';
import { ResultsTable } from './results-table';
import { downloadJson, downloadCsv, downloadExcel } from '@/lib/export';

const UrlFormSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
})

const HtmlFormSchema = z.object({
  html: z.string().min(100, { message: "Please enter a substantial amount of HTML."}),
})

export function MainPage() {
  const [results, setResults] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  
  // Add filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all');

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const urlForm = useForm<z.infer<typeof UrlFormSchema>>({
    resolver: zodResolver(UrlFormSchema),
    defaultValues: { url: "" },
  })

  const htmlForm = useForm<z.infer<typeof HtmlFormSchema>>({
    resolver: zodResolver(HtmlFormSchema),
    defaultValues: { html: "" },
  })
  
  const handleScrape = useCallback(async (scrapeAction: () => Promise<Property[] | null>) => {
    setIsLoading(true);
    setResults([]);
    startTransition(async () => {
      try {
        const data = await scrapeAction();
        if (data) {
          setResults(data);
          toast({ title: "Scraping Successful", description: `Found ${data.length} properties.` });
        } else {
          throw new Error("No data returned from scraping.");
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Scraping Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    });
  }, [toast]);

  const onUrlSubmit = (values: z.infer<typeof UrlFormSchema>) => {
    handleScrape(() => scrapeUrl(values.url));
    urlForm.reset();
  };

  const onHtmlSubmit = (values: z.infer<typeof HtmlFormSchema>) => {
    handleScrape(() => scrapeHtml(values.html));
    htmlForm.reset();
  };

  const handleBulkSubmit = () => {
    if(!bulkUrls.trim()){
      toast({ variant: "destructive", title: "Input Error", description: "URL list cannot be empty." });
      return;
    }
    handleScrape(() => scrapeBulk(bulkUrls));
    setBulkUrls('');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setBulkUrls(content);
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "File Error", description: "Failed to read the file." });
    }
    reader.readAsText(file);
  };
  
  const handleDragEvents = (e: DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const handleSaveProperty = useCallback((property: Property) => {
    startTransition(async () => {
      try {
        await saveProperty(property);
        toast({
          title: "Property Saved",
          description: "The property has been added to your database.",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Could not save the property to the database.",
        });
      }
    });
  }, [toast]);

  // Add filtered results logic
  const filteredResults = useMemo(() => {
    let filtered = results;

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
        property.price.toLowerCase().includes(query)
      );
    }

    // Property type filter
    if (selectedPropertyType !== 'all') {
      filtered = filtered.filter(property => 
        property.property_type.toLowerCase() === selectedPropertyType.toLowerCase()
      );
    }

    return filtered;
  }, [results, searchQuery, selectedPropertyType]);

  // Get unique property types for filter dropdown
  const propertyTypes = useMemo(() => {
    const types = [...new Set(results.map(p => p.property_type).filter(Boolean))];
    return types.sort();
  }, [results]);

  return (
    <>
      <div className="w-full max-w-5xl mx-auto">
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
            <TabsTrigger value="url">Scrape by URL</TabsTrigger>
            <TabsTrigger value="html">Scrape by HTML</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Scrape</TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <Form {...urlForm}>
              <form onSubmit={urlForm.handleSubmit(onUrlSubmit)} className="space-y-4 card-glass p-6 rounded-b-lg">
                <FormField
                  control={urlForm.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/property/123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? <Loader2 className="animate-spin" /> : "Scrape URL"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="html">
            <Form {...htmlForm}>
                <form onSubmit={htmlForm.handleSubmit(onHtmlSubmit)} className="space-y-4 card-glass p-6 rounded-b-lg">
                  <FormField
                    control={htmlForm.control}
                    name="html"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTML Source Code</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Paste HTML source code here..." className="min-h-[200px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? <Loader2 className="animate-spin" /> : "Scrape HTML"}
                     <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
            </Form>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="card-glass p-6 rounded-b-lg space-y-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                onDrop={handleDrop}
                onDragOver={(e) => handleDragEvents(e, true)}
                onDragEnter={(e) => handleDragEvents(e, true)}
                onDragLeave={(e) => handleDragEvents(e, false)}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag & drop a .txt, .csv file with URLs here, or click to select file.
                </p>
                <input id="file-upload" type="file" className="hidden" accept=".txt,.csv" onChange={handleFileChange} />
              </div>
              <Textarea 
                placeholder="Or paste a list of URLs (one per line)" 
                className="min-h-[150px]"
                value={bulkUrls}
                onChange={(e) => setBulkUrls(e.target.value)}
              />
               <Button onClick={handleBulkSubmit} disabled={isLoading} className="w-full sm:w-auto">
                 {isLoading ? <Loader2 className="animate-spin" /> : "Start Bulk Scrape"}
                 <ArrowRight className="ml-2 h-4 w-4" />
               </Button>
            </div>
          </TabsContent>
        </Tabs>

        {(isLoading || results.length > 0) && (
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h2 className="text-2xl font-bold">Scraping Results</h2>
              {results.length > 0 && !isLoading && (
                 <div className="flex gap-2">
                  <Button variant="outline" onClick={() => downloadJson(filteredResults, 'properties')}>Export JSON</Button>
                  <Button variant="outline" onClick={() => downloadCsv(filteredResults, 'properties')}>Export CSV</Button>
                  <Button variant="outline" onClick={() => downloadExcel(filteredResults, 'properties')}>Export Excel</Button>
                  <Button variant="destructive" size="sm" onClick={() => setResults([])}><Trash2 className="mr-2 h-4 w-4"/>Clear Results</Button>
                </div>
              )}
            </div>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Add filter section when there are results */}
                {results.length > 0 && (
                  <div className="mb-4 p-4 border rounded-lg bg-muted/20">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="flex items-center gap-2 flex-1">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search properties by title, location, type, or price..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
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
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Showing {filteredResults.length} of {results.length} properties
                      {(searchQuery || selectedPropertyType !== 'all') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedPropertyType('all');
                          }}
                          className="ml-2 h-auto p-1 text-xs"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <ResultsTable 
                  properties={filteredResults}
                  onSave={handleSaveProperty}
                />
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
