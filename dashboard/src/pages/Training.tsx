import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Mic, Languages, Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

const Training = () => {
  const { t } = useTranslation();
  const [selectedInteraction, setSelectedInteraction] = useState<string>('');
  const [correctRole, setCorrectRole] = useState<string>('');
  const [correctLanguage, setCorrectLanguage] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [modelAccuracy, setModelAccuracy] = useState<number>(85.2);

  const sampleInteractions = [
    { id: 'int_001', transcript: 'Hello, I need help with my order...', predictedRole: 'staff', confidence: 0.87 },
    { id: 'int_002', transcript: 'मुझे अपने ऑर्डर में मदद चाहिए...', predictedRole: 'customer', confidence: 0.92 },
    { id: 'int_003', transcript: 'Thank you for calling, how can I help?', predictedRole: 'staff', confidence: 0.89 }
  ];

  const supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'bn', name: 'Bengali' },
    { code: 'mr', name: 'Marathi' },
    { code: 'gu', name: 'Gujarati' }
  ];

  const handleSubmitFeedback = async () => {
    if (!selectedInteraction || !correctRole || !correctLanguage) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Simulate API call
      setTrainingProgress(25);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTrainingProgress(50);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTrainingProgress(75);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTrainingProgress(100);
      
      // Update model accuracy
      setModelAccuracy(prev => Math.min(95, prev + 0.5));
      
      // Reset form
      setSelectedInteraction('');
      setCorrectRole('');
      setCorrectLanguage('');
      setFeedback('');
      
      setTimeout(() => setTrainingProgress(0), 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Training Center</h1>
          <p className="text-muted-foreground">Improve voice analysis and language detection accuracy</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{modelAccuracy}%</div>
            <div className="text-sm text-muted-foreground">Model Accuracy</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback">Training Feedback</TabsTrigger>
          <TabsTrigger value="performance">Model Performance</TabsTrigger>
          <TabsTrigger value="languages">Language Training</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Voice Analysis Training</span>
                </CardTitle>
                <CardDescription>
                  Help improve speaker role detection and voice characteristics analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="interaction">Select Interaction</Label>
                  <Select value={selectedInteraction} onValueChange={setSelectedInteraction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an interaction to review" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleInteractions.map((interaction) => (
                        <SelectItem key={interaction.id} value={interaction.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{interaction.transcript.substring(0, 50)}...</span>
                            <Badge variant="secondary" className="ml-2">
                              {interaction.predictedRole} ({Math.round(interaction.confidence * 100)}%)
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="correctRole">Correct Speaker Role</Label>
                  <Select value={correctRole} onValueChange={setCorrectRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select the correct role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="correctLanguage">Correct Language</Label>
                  <Select value={correctLanguage} onValueChange={setCorrectLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select the correct language" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="feedback">Additional Feedback</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Any additional notes about this interaction..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>

                <Button onClick={handleSubmitFeedback} className="w-full" disabled={trainingProgress > 0}>
                  {trainingProgress > 0 ? 'Training...' : 'Submit Feedback'}
                </Button>

                {trainingProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Training Progress</span>
                      <span>{trainingProgress}%</span>
                    </div>
                    <Progress value={trainingProgress} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Training Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">1,247</div>
                    <div className="text-sm text-blue-600">Training Samples</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">85.2%</div>
                    <div className="text-sm text-green-600">Accuracy</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">13</div>
                    <div className="text-sm text-purple-600">Languages</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">2,341</div>
                    <div className="text-sm text-orange-600">Voice Samples</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Recent Improvements</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Hindi language detection +3.2%</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Staff voice recognition +2.1%</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Customer sentiment analysis +1.8%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Voice Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87.3%</div>
                <p className="text-xs text-muted-foreground">Speaker role detection accuracy</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Language Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">92.1%</div>
                <p className="text-xs text-muted-foreground">Indian language identification</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sentiment Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89.7%</div>
                <p className="text-xs text-muted-foreground">Emotion recognition accuracy</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="languages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Languages className="h-5 w-5" />
                <span>Language Training Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supportedLanguages.map((lang) => (
                  <div key={lang.code} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{lang.code.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-medium">{lang.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.floor(Math.random() * 500) + 100} training samples
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {Math.floor(Math.random() * 20) + 80}%
                      </div>
                      <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.floor(Math.random() * 20) + 80}%` }}
                        ></div>
                      </div>
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

export default Training;
