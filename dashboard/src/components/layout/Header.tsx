import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Search, 
  Settings, 
  Globe,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { useTheme } from "next-themes";

interface HeaderProps {
  currentPage: string;
}

export function Header({ currentPage }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'ingest':
        return 'Audio Ingestion';
      case 'translator':
        return 'Voice Translator';
      case 'trends':
        return 'Analytics Trends';
      case 'interactions':
        return 'Conversations';
      case 'qa':
        return 'Quality Assurance';
      default:
        return 'FYND Analytics';
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-semibold text-foreground">{getPageTitle()}</h2>
        <Badge variant="secondary" className="text-xs">
          Real-time
        </Badge>
      </div>

      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Language Selector */}
        <Select value={i18n.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en-IN">🇺🇸 English</SelectItem>
            <SelectItem value="hi-IN">🇮🇳 Hindi</SelectItem>
          </SelectContent>
        </Select>

        {/* Theme Toggle */}
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <Sun className="h-4 w-4" />
            </SelectItem>
            <SelectItem value="dark">
              <Moon className="h-4 w-4" />
            </SelectItem>
            <SelectItem value="system">
              <Monitor className="h-4 w-4" />
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
