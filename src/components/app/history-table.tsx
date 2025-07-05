"use client";

import { Clock, FileText, Globe, Hash, Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { HistoryEntry } from '@/lib/types';
import { format } from 'date-fns';

interface HistoryTableProps {
  history: HistoryEntry[];
}

export function HistoryTable({ history }: HistoryTableProps) {
  if (history.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
           <Info className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No scraping history found. Your scraping activities will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: HistoryEntry['type']) => {
    switch(type) {
      case 'URL': return <Globe className="h-4 w-4 text-blue-500" />;
      case 'HTML': return <FileText className="h-4 w-4 text-green-500" />;
      case 'BULK': return <Hash className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="text-center">Properties Found</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                    {getIcon(entry.type)}
                    <span className="font-medium">{entry.type}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-sm truncate">
                <span title={entry.details}>{entry.details}</span>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={entry.propertyCount > 0 ? "default" : "secondary"}>{entry.propertyCount}</Badge>
              </TableCell>
              <TableCell className="text-right flex items-center justify-end gap-2">
                <Clock className="h-4 w-4 text-muted-foreground"/>
                {format(new Date(entry.date), "PPP p")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
