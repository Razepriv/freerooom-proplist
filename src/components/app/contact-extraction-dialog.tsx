"use client";

import { useState } from 'react';
import { type Property } from '@/lib/types';
import { type ExtractedContact } from '@/lib/contact-extraction';
import { extractContactsFromAllPropertiesAction, updatePropertyWithExtractedContactsAction } from '@/app/actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Mail, User, Search, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ContactExtractionDialogProps {
  allProperties: Property[];
  onPropertyUpdate?: (property: Property) => void;
}

export function ContactExtractionDialog({ allProperties, onPropertyUpdate }: ContactExtractionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [extractedContacts, setExtractedContacts] = useState<{
    property: Property;
    contacts: ExtractedContact;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExtractContacts = async () => {
    setIsLoading(true);
    try {
      const contacts = await extractContactsFromAllPropertiesAction();
      setExtractedContacts(contacts);
      toast({ 
        title: "Extraction Complete", 
        description: `Found contact information in ${contacts.length} properties.` 
      });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Extraction Failed", 
        description: "Failed to extract contact information." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProperty = async (propertyId: string) => {
    setIsUpdating(propertyId);
    try {
      const updatedProperty = await updatePropertyWithExtractedContactsAction(propertyId);
      if (updatedProperty && onPropertyUpdate) {
        onPropertyUpdate(updatedProperty);
      }
      toast({ 
        title: "Property Updated", 
        description: "Contact information has been saved to the property." 
      });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Update Failed", 
        description: "Failed to update property with contact information." 
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const totalPhones = extractedContacts.reduce((sum, item) => sum + item.contacts.phones.length, 0);
  const totalEmails = extractedContacts.reduce((sum, item) => sum + item.contacts.emails.length, 0);
  const totalNames = extractedContacts.reduce((sum, item) => sum + item.contacts.names.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Extract Contact Info
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Contact Information Extraction
          </DialogTitle>
          <DialogDescription>
            Extract phone numbers, emails, and agent names from property descriptions and details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div className="text-sm">
                <span className="font-medium">{allProperties.length}</span> properties total
              </div>
              {extractedContacts.length > 0 && (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{totalPhones} phones</span>
                  <span>{totalEmails} emails</span>
                  <span>{totalNames} names</span>
                </div>
              )}
            </div>
            <Button 
              onClick={handleExtractContacts}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isLoading ? 'Extracting...' : 'Extract Contacts'}
            </Button>
          </div>

          {extractedContacts.length > 0 && (
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All Results ({extractedContacts.length})</TabsTrigger>
                <TabsTrigger value="phones">Phone Numbers ({totalPhones})</TabsTrigger>
                <TabsTrigger value="emails">Emails ({totalEmails})</TabsTrigger>
                <TabsTrigger value="names">Agent Names ({totalNames})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="grid gap-4">
                    {extractedContacts.map(({ property, contacts }) => (
                      <Card key={property.id}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-sm font-medium line-clamp-1">
                                {property.title}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {property.location} • {property.property_type}
                              </CardDescription>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateProperty(property.id)}
                              disabled={isUpdating === property.id}
                              className="gap-1 text-xs"
                            >
                              {isUpdating === property.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                'Update Property'
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {contacts.phones.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Phone className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium">Phones</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {contacts.phones.map((phone, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {phone}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {contacts.emails.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Mail className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium">Emails</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {contacts.emails.map((email, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {email}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {contacts.names.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm font-medium">Names</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {contacts.names.map((name, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="phones">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-2">
                    {extractedContacts
                      .filter(item => item.contacts.phones.length > 0)
                      .map(({ property, contacts }) => (
                        <div key={property.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium text-sm">{property.title}</div>
                            <div className="flex gap-2 mt-1">
                              {contacts.phones.map((phone, idx) => (
                                <Badge key={idx} variant="outline">{phone}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateProperty(property.id)}>
                            Update
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="emails">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-2">
                    {extractedContacts
                      .filter(item => item.contacts.emails.length > 0)
                      .map(({ property, contacts }) => (
                        <div key={property.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium text-sm">{property.title}</div>
                            <div className="flex gap-2 mt-1">
                              {contacts.emails.map((email, idx) => (
                                <Badge key={idx} variant="outline">{email}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateProperty(property.id)}>
                            Update
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="names">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-2">
                    {extractedContacts
                      .filter(item => item.contacts.names.length > 0)
                      .map(({ property, contacts }) => (
                        <div key={property.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium text-sm">{property.title}</div>
                            <div className="flex gap-2 mt-1">
                              {contacts.names.map((name, idx) => (
                                <Badge key={idx} variant="outline">{name}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateProperty(property.id)}>
                            Update
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          {!isLoading && extractedContacts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Click "Extract Contacts" to analyze your properties for contact information.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
