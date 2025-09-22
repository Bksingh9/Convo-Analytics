import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, 
  Users, 
  Languages, 
  TrendingUp, 
  Volume2, 
  UserCheck, 
  MessageSquare,
  Brain,
  Activity,
  BarChart3
} from 'lucide-react';

interface VoiceCharacteristics {
  pitch_mean: number;
  pitch_std: number;
  energy_mean: number;
  voice_type: string;
  speaking_rate: number;
}

interface SpeakerAnalysis {
  speaker_id: string;
  role: string;
  language: string;
  confidence: number;
  voice_characteristics: VoiceCharacteristics;
}

interface VoiceAnalysisDashboardProps {
  interactionId: string;
  speakerAnalysis: SpeakerAnalysis[];
  insights: any[];
  detectedLanguage: string;
}

const VoiceAnalysisDashboard: React.FC<VoiceAnalysisDashboardProps> = ({
  interactionId,
  speakerAnalysis,
  insights,
  detectedLanguage
}) => {
  const { t } = useTranslation();
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');

  useEffect(() => {
    if (speakerAnalysis.length > 0 && !selectedSpeaker) {
      setSelectedSpeaker(speakerAnalysis[0].speaker_id);
    }
  }, [speakerAnalysis, selectedSpeaker]);

  const selectedSpeakerData = speakerAnalysis.find(s => s.speaker_id === selectedSpeaker);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'staff': return 'bg-blue-100 text-blue-800';
      case 'customer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVoiceTypeColor = (voiceType: string) => {
    switch (voiceType) {
      case 'male': return 'bg-blue-100 text-blue-800';
      case 'female': return 'bg-pink-100 text-pink-800';
      case 'child': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'bn': 'Bengali',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi'
    };
    return languages[code] || code;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Voice Analysis Dashboard</h2>
          <p className="text-muted-foreground">Detailed voice characteristics and speaker analysis</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Languages className="h-3 w-3 mr-1" />
          {getLanguageName(detectedLanguage)}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Speakers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{speakerAnalysis.length}</div>
            <p className="text-xs text-muted-foreground">
              {speakerAnalysis.filter(s => s.role === 'staff').length} staff, {speakerAnalysis.filter(s => s.role === 'customer').length} customer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((speakerAnalysis.reduce((acc, s) => acc + s.confidence, 0) / speakerAnalysis.length) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Speaker role detection accuracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voice Types</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(speakerAnalysis.map(s => s.voice_characteristics.voice_type)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique voice characteristics detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.length}</div>
            <p className="text-xs text-muted-foreground">
              {insights.filter(i => i.action_required).length} require action
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="speakers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="speakers">Speaker Analysis</TabsTrigger>
          <TabsTrigger value="characteristics">Voice Characteristics</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="speakers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Speaker Overview</CardTitle>
                <CardDescription>Select a speaker to view detailed analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {speakerAnalysis.map((speaker) => (
                  <div
                    key={speaker.speaker_id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSpeaker === speaker.speaker_id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedSpeaker(speaker.speaker_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">{speaker.speaker_id}</div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getRoleColor(speaker.role)}>
                              {speaker.role}
                            </Badge>
                            <Badge className={getVoiceTypeColor(speaker.voice_characteristics.voice_type)}>
                              {speaker.voice_characteristics.voice_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getConfidenceColor(speaker.confidence)}`}>
                          {Math.round(speaker.confidence * 100)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getLanguageName(speaker.language)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {selectedSpeakerData && (
              <Card>
                <CardHeader>
                  <CardTitle>Speaker Details</CardTitle>
                  <CardDescription>
                    Detailed analysis for {selectedSpeakerData.speaker_id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Role</div>
                      <Badge className={getRoleColor(selectedSpeakerData.role)}>
                        {selectedSpeakerData.role}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Language</div>
                      <div className="font-medium">{getLanguageName(selectedSpeakerData.language)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Voice Type</div>
                      <Badge className={getVoiceTypeColor(selectedSpeakerData.voice_characteristics.voice_type)}>
                        {selectedSpeakerData.voice_characteristics.voice_type}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Confidence</div>
                      <div className={`font-medium ${getConfidenceColor(selectedSpeakerData.confidence)}`}>
                        {Math.round(selectedSpeakerData.confidence * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Speaking Rate</span>
                        <span>{selectedSpeakerData.voice_characteristics.speaking_rate.toFixed(1)}s</span>
                      </div>
                      <Progress 
                        value={(selectedSpeakerData.voice_characteristics.speaking_rate / 10) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Pitch (Hz)</span>
                        <span>{selectedSpeakerData.voice_characteristics.pitch_mean.toFixed(0)}</span>
                      </div>
                      <Progress 
                        value={(selectedSpeakerData.voice_characteristics.pitch_mean / 300) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Energy Level</span>
                        <span>{selectedSpeakerData.voice_characteristics.energy_mean.toFixed(2)}</span>
                      </div>
                      <Progress 
                        value={selectedSpeakerData.voice_characteristics.energy_mean * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="characteristics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voice Characteristics Analysis</CardTitle>
              <CardDescription>Detailed voice analysis across all speakers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {speakerAnalysis.map((speaker) => (
                  <div key={speaker.speaker_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{speaker.speaker_id}</span>
                        <Badge className={getRoleColor(speaker.role)}>{speaker.role}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Confidence: {Math.round(speaker.confidence * 100)}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {speaker.voice_characteristics.pitch_mean.toFixed(0)} Hz
                        </div>
                        <div className="text-sm text-blue-600">Average Pitch</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {speaker.voice_characteristics.energy_mean.toFixed(2)}
                        </div>
                        <div className="text-sm text-green-600">Energy Level</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">
                          {speaker.voice_characteristics.speaking_rate.toFixed(1)}s
                        </div>
                        <div className="text-sm text-purple-600">Speaking Rate</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
              <CardDescription>Intelligent analysis of conversation patterns and voice characteristics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={insight.action_required ? "destructive" : "secondary"}>
                            {insight.type}
                          </Badge>
                          <Badge variant="outline">{insight.category}</Badge>
                          <div className="text-sm text-muted-foreground">
                            Confidence: {Math.round(insight.confidence * 100)}%
                          </div>
                        </div>
                        <p className="text-sm mb-2">{insight.message}</p>
                        {insight.details && (
                          <p className="text-xs text-muted-foreground">{insight.details}</p>
                        )}
                        {insight.keywords && insight.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {insight.keywords.map((keyword, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {insight.action_required && (
                        <Button size="sm" variant="outline">
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VoiceAnalysisDashboard;
