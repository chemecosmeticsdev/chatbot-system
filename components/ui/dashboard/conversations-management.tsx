'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  MoreHorizontal,
  MessageSquare,
  Trash2,
  Eye,
  Download,
  Star,
  AlertTriangle,
  Clock,
  User,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  feedback?: 'positive' | 'negative';
}

interface Conversation {
  id: string;
  title: string;
  chatbotId: string;
  chatbotName: string;
  userId?: string;
  userName?: string;
  status: 'active' | 'completed' | 'escalated' | 'abandoned';
  startTime: string;
  endTime?: string;
  messageCount: number;
  rating?: number;
  feedback?: string;
  tags: string[];
  source: 'website' | 'line' | 'api' | 'test';
  isStarred: boolean;
  hasIssues: boolean;
  lastMessage: string;
  responseTime: number; // average response time in seconds
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'Product inquiry about Smart Hub',
    chatbotId: '1',
    chatbotName: 'Customer Support Bot',
    userId: 'user_123',
    userName: 'John Smith',
    status: 'completed',
    startTime: '2024-01-22T14:30:00Z',
    endTime: '2024-01-22T14:45:00Z',
    messageCount: 8,
    rating: 5,
    feedback: 'Very helpful bot, answered all my questions quickly!',
    tags: ['product-inquiry', 'smart-hub', 'resolved'],
    source: 'website',
    isStarred: true,
    hasIssues: false,
    lastMessage: 'Thank you for your help! I\'ll proceed with the purchase.',
    responseTime: 2.3
  },
  {
    id: '2',
    title: 'Technical support for installation',
    chatbotId: '1',
    chatbotName: 'Customer Support Bot',
    userId: 'user_456',
    userName: 'Sarah Johnson',
    status: 'escalated',
    startTime: '2024-01-22T10:15:00Z',
    endTime: '2024-01-22T10:35:00Z',
    messageCount: 12,
    rating: 2,
    feedback: 'Bot couldn\'t understand my complex technical issue',
    tags: ['technical-support', 'installation', 'escalated'],
    source: 'line',
    isStarred: false,
    hasIssues: true,
    lastMessage: 'I need to speak with a human technician.',
    responseTime: 4.8
  },
  {
    id: '3',
    title: 'Product recommendations',
    chatbotId: '2',
    chatbotName: 'Product Advisor',
    userId: 'user_789',
    userName: 'Mike Chen',
    status: 'active',
    startTime: '2024-01-22T16:20:00Z',
    messageCount: 5,
    tags: ['product-recommendation', 'ongoing'],
    source: 'website',
    isStarred: false,
    hasIssues: false,
    lastMessage: 'What features are most important to you?',
    responseTime: 1.9
  },
  {
    id: '4',
    title: 'Anonymous chat session',
    chatbotId: '1',
    chatbotName: 'Customer Support Bot',
    status: 'abandoned',
    startTime: '2024-01-22T09:45:00Z',
    messageCount: 2,
    tags: ['abandoned', 'quick-exit'],
    source: 'api',
    isStarred: false,
    hasIssues: false,
    lastMessage: 'Hi there! How can I help you today?',
    responseTime: 1.2
  },
  {
    id: '5',
    title: 'Pricing and availability inquiry',
    chatbotId: '2',
    chatbotName: 'Product Advisor',
    userId: 'user_101',
    userName: 'Lisa Wong',
    status: 'completed',
    startTime: '2024-01-21T13:10:00Z',
    endTime: '2024-01-21T13:25:00Z',
    messageCount: 6,
    rating: 4,
    feedback: 'Good responses but could be more detailed about pricing',
    tags: ['pricing', 'availability', 'resolved'],
    source: 'website',
    isStarred: false,
    hasIssues: false,
    lastMessage: 'Perfect, I\'ll check back when it\'s in stock.',
    responseTime: 2.1
  }
];

const mockMessages: { [conversationId: string]: Message[] } = {
  '1': [
    {
      id: '1_1',
      type: 'user',
      content: 'Hi, I\'m interested in the Smart Home Hub Pro. Can you tell me more about it?',
      timestamp: '2024-01-22T14:30:15Z'
    },
    {
      id: '1_2',
      type: 'assistant',
      content: 'Hello! I\'d be happy to help you learn more about the Smart Home Hub Pro. It\'s our advanced automation hub with AI voice control, supporting over 1000 smart devices. What specific features are you most interested in?',
      timestamp: '2024-01-22T14:30:18Z'
    },
    {
      id: '1_3',
      type: 'user',
      content: 'Does it work with Alexa and Google Assistant?',
      timestamp: '2024-01-22T14:31:02Z'
    },
    {
      id: '1_4',
      type: 'assistant',
      content: 'Yes! The Smart Home Hub Pro is compatible with both Amazon Alexa and Google Assistant. You can control it using voice commands through either platform, and it also has its own built-in AI assistant for advanced automation.',
      timestamp: '2024-01-22T14:31:05Z',
      feedback: 'positive'
    }
  ]
};

export function ConversationsManagement() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [chatbotFilter, setChatbotFilter] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conversation.userName && conversation.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         conversation.chatbotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conversation.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || conversation.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || conversation.source === sourceFilter;
    const matchesChatbot = chatbotFilter === 'all' || conversation.chatbotId === chatbotFilter;
    return matchesSearch && matchesStatus && matchesSource && matchesChatbot;
  });

  const handleDeleteConversation = (id: string) => {
    setConversations(conversations.filter(conversation => conversation.id !== id));
  };

  const handleToggleStar = (id: string) => {
    setConversations(conversations.map(conversation =>
      conversation.id === id
        ? { ...conversation, isStarred: !conversation.isStarred }
        : conversation
    ));
  };

  const handleViewConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>;
      case 'escalated':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Escalated</Badge>;
      case 'abandoned':
        return <Badge variant="secondary">Abandoned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    const sourceConfig = {
      website: { label: 'Website', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      line: { label: 'LINE', className: 'bg-green-100 text-green-800 border-green-200' },
      api: { label: 'API', className: 'bg-purple-100 text-purple-800 border-purple-200' },
      test: { label: 'Test', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    };

    const config = sourceConfig[source as keyof typeof sourceConfig] || { label: source, className: '' };

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'Ongoing';

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return <span className="text-muted-foreground">No rating</span>;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating}/5)</span>
      </div>
    );
  };

  const uniqueChatbots = Array.from(new Set(conversations.map(c => c.chatbotName)))
    .map(name => ({ id: conversations.find(c => c.chatbotName === name)?.chatbotId || '', name }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Conversations</h2>
          <p className="text-muted-foreground">
            Monitor and manage chatbot conversations and user interactions
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="line">LINE</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="test">Test</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chatbotFilter} onValueChange={setChatbotFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Chatbot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chatbots</SelectItem>
                {uniqueChatbots.map((chatbot) => (
                  <SelectItem key={chatbot.id} value={chatbot.id}>
                    {chatbot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation History</CardTitle>
          <CardDescription>
            {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conversation</TableHead>
                  <TableHead>Chatbot</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversations.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{conversation.title}</div>
                          {conversation.isStarred && (
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          )}
                          {conversation.hasIssues && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {conversation.messageCount} messages • {formatDate(conversation.startTime)}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {conversation.lastMessage}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {conversation.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {conversation.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{conversation.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{conversation.chatbotName}</Badge>
                    </TableCell>
                    <TableCell>
                      {conversation.userName ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{conversation.userName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Anonymous</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(conversation.status)}</TableCell>
                    <TableCell>{getSourceBadge(conversation.source)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{formatDuration(conversation.startTime, conversation.endTime)}</div>
                        <div className="text-xs text-muted-foreground">
                          Avg: {conversation.responseTime.toFixed(1)}s
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRatingStars(conversation.rating)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewConversation(conversation)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Messages
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStar(conversation.id)}>
                            <Star className="mr-2 h-4 w-4" />
                            {conversation.isStarred ? 'Unstar' : 'Star'}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the conversation
                                  "{conversation.title}" and all associated messages.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteConversation(conversation.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredConversations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No conversations found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Conversation Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {selectedConversation?.title}
            </DialogTitle>
            <DialogDescription>
              Conversation with {selectedConversation?.userName || 'Anonymous'} via {selectedConversation?.chatbotName}
            </DialogDescription>
          </DialogHeader>

          {selectedConversation && (
            <div className="space-y-4">
              {/* Conversation Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <div className="mt-1">{getStatusBadge(selectedConversation.status)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Duration</div>
                  <div className="mt-1 text-sm">{formatDuration(selectedConversation.startTime, selectedConversation.endTime)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Messages</div>
                  <div className="mt-1 text-sm">{selectedConversation.messageCount}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Rating</div>
                  <div className="mt-1">{getRatingStars(selectedConversation.rating)}</div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="space-y-4">
                  {mockMessages[selectedConversation.id]?.map((message, index) => (
                    <div key={message.id}>
                      <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <div className="flex items-start gap-2 mb-2">
                            {message.type === 'user' ? (
                              <User className="w-4 h-4 mt-0.5" />
                            ) : (
                              <Bot className="w-4 h-4 mt-0.5" />
                            )}
                            <div className="text-sm font-medium">
                              {message.type === 'user' ? (selectedConversation.userName || 'User') : selectedConversation.chatbotName}
                            </div>
                          </div>
                          <div className="text-sm">{message.content}</div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs opacity-70">
                              {formatDate(message.timestamp)}
                            </div>
                            {message.feedback && (
                              <div className="flex items-center gap-1">
                                {message.feedback === 'positive' ? (
                                  <ThumbsUp className="w-3 h-3 text-green-500" />
                                ) : (
                                  <ThumbsDown className="w-3 h-3 text-red-500" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < (mockMessages[selectedConversation.id]?.length || 0) - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Feedback */}
              {selectedConversation.feedback && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium mb-2">User Feedback</div>
                  <div className="text-sm text-muted-foreground">{selectedConversation.feedback}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}