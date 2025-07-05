"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type Property } from '@/lib/types';
import { 
  Calendar, 
  Home, 
  TrendingUp, 
  BarChart3,
  Building,
  MapPin,
  Clock
} from 'lucide-react';

interface DashboardStatsProps {
  properties: Property[];
}

export function DashboardStats({ properties }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Filter properties scraped today
    const todayProperties = properties.filter(prop => {
      const scrapedDate = new Date(prop.scraped_at);
      return scrapedDate >= todayStart;
    });

    // Get unique property types and their counts
    const propertyTypes = properties.reduce((acc, prop) => {
      const type = prop.property_type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get unique locations and their counts
    const locations = properties.reduce((acc, prop) => {
      const location = prop.city || prop.location || 'Unknown';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get scraping activity by date (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        count: properties.filter(prop => {
          const scrapedDate = new Date(prop.scraped_at);
          return scrapedDate.toISOString().split('T')[0] === date.toISOString().split('T')[0];
        }).length
      };
    }).reverse();

    // Get most popular property type
    const mostPopularType = Object.entries(propertyTypes)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      totalProperties: properties.length,
      todayProperties: todayProperties.length,
      propertyTypes,
      locations,
      last7Days,
      mostPopularType: mostPopularType ? mostPopularType[0] : 'N/A',
      mostPopularTypeCount: mostPopularType ? mostPopularType[1] : 0
    };
  }, [properties]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Today's Scraping */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Scraping</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.todayProperties}</div>
          <p className="text-xs text-muted-foreground">
            Properties scraped today
          </p>
        </CardContent>
      </Card>

      {/* Total Properties */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProperties}</div>
          <p className="text-xs text-muted-foreground">
            All time scraped properties
          </p>
        </CardContent>
      </Card>

      {/* Most Popular Type */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Popular Type</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.mostPopularTypeCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.mostPopularType} properties
          </p>
        </CardContent>
      </Card>

      {/* Weekly Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">7-Day Activity</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.last7Days.reduce((sum, day) => sum + day.count, 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Properties this week
          </p>
        </CardContent>
      </Card>

      {/* Property Types Distribution */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Property Types Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.propertyTypes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => {
              const percentage = (count / stats.totalProperties) * 100;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{type}</span>
                    <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Top Locations */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Top Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.locations)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([location, count]) => (
                <Badge key={location} variant="secondary" className="text-xs">
                  {location} ({count})
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Chart */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scraping Activity (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-32 gap-2">
            {stats.last7Days.map((day, index) => {
              const maxCount = Math.max(...stats.last7Days.map(d => d.count));
              const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div 
                    className="bg-primary rounded-t w-full min-h-[4px] transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-xs font-medium">
                    {day.count}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
