import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Search, Filter, Eye, Download, Calendar } from "lucide-react";

// Import our existing components
import NavigationBar from "../components/NavigationBar";
import ConversationMapper from "../components/ConversationMapper";

interface InteractionsProps {
  rows: any[];
  openId: string;
  setOpenId: (id: string) => void;
  lastResult: any;
  filters: any;
  onFilterChange: (filters: any) => void;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export default function Interactions({ 
  rows, 
  openId, 
  setOpenId, 
  lastResult,
  filters,
  onFilterChange,
  currentLanguage,
  onLanguageChange
}: InteractionsProps) {
  const { t } = useTranslation();

  const filteredRows = rows.filter(row => {
    if (filters.category !== "all") {
      const summary = (row.summary || "").toLowerCase();
      switch (filters.category) {
        case "price":
          return summary.includes("price") || summary.includes("cost");
        case "stock":
          return summary.includes("stock") || summary.includes("inventory");
        case "quality":
          return summary.includes("quality") || summary.includes("defect");
        case "delivery":
          return summary.includes("delivery") || summary.includes("shipping");
        case "support":
          return summary.includes("support") || summary.includes("help");
        case "process":
          return summary.includes("process") || summary.includes("policy");
        case "knowledge":
          return summary.includes("knowledge") || summary.includes("confused");
        default:
          return true;
      }
    }
    
    if (filters.sentiment !== "all") {
      const sentiment = row.metrics?.sentiment || 0;
      switch (filters.sentiment) {
        case "positive":
          return sentiment > 0.1;
        case "negative":
          return sentiment < -0.1;
        case "neutral":
          return sentiment >= -0.1 && sentiment <= 0.1;
        default:
          return true;
      }
    }
    
    if (filters.redFlags && (row.metrics?.red_flag_score || 0) === 0) {
      return false;
    }
    
    return true;
  });

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return "bg-green-100 text-green-800";
    if (sentiment < -0.1) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.1) return "Positive";
    if (sentiment < -0.1) return "Negative";
    return "Neutral";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">
            View and analyze all recorded conversations with advanced filtering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            <MessageSquare className="h-3 w-3 mr-1" />
            {filteredRows.length} conversations
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Navigation Bar */}
      <NavigationBar 
        onFilterChange={onFilterChange}
        onLanguageChange={onLanguageChange}
        currentLanguage={currentLanguage}
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search conversations..."
                className="w-full"
              />
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="sentiment">Sentiment</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <div className="space-y-4">
        {filteredRows.map((row, index) => (
          <Card key={row.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {row.id.slice(0, 8)}...
                    </span>
                    <Badge className={getSentimentColor(row.metrics?.sentiment || 0)}>
                      {getSentimentLabel(row.metrics?.sentiment || 0)}
                    </Badge>
                    {(row.metrics?.red_flag_score || 0) > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        🔴 Red Flag
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="font-medium text-sm mb-1">
                      {row.summary || "No summary available"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Store: {row.store_id} • User: {row.user_id}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(row.started_at).toLocaleDateString()}
                    </div>
                    <div>
                      Sentiment: {(row.metrics?.sentiment || 0).toFixed(2)}
                    </div>
                    <div>
                      RF Score: {(row.metrics?.red_flag_score || 0).toFixed(0)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenId(row.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRows.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No conversations found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or record some audio to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed View Modal */}
      {openId && lastResult && lastResult.id === openId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Conversation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {lastResult.summary || "No summary available"}
                </p>
                <h4 className="font-medium mb-2">Keywords</h4>
                <div className="flex flex-wrap gap-1">
                  {lastResult.keywords?.map((keyword: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  )) || <span className="text-xs text-muted-foreground">No keywords</span>}
                </div>
              </div>
              
              {/* Conversation Mapping */}
              {lastResult.conversation_flow && (
                <ConversationMapper
                  conversationFlow={lastResult.conversation_flow}
                  transcript={lastResult.transcript || ""}
                  translations={lastResult.translations || {}}
                  currentLanguage={currentLanguage}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
