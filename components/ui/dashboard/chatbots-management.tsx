'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  Search,
  Filter,
  MoreHorizontal,
  Settings,
  MessageSquare
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

interface Chatbot {
  id: string;
  name: string;
  description: string;
  model: string;
  status: 'active' | 'inactive' | 'training';
  conversationsCount: number;
  knowledgeBaseItems: number;
  createdAt: string;
  lastUpdated: string;
}

interface ChatbotFormData {
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

const mockChatbots: Chatbot[] = [
  {
    id: '1',
    name: 'Customer Support Bot',
    description: 'Handles customer inquiries and support tickets',
    model: 'claude-3-haiku',
    status: 'active',
    conversationsCount: 1248,
    knowledgeBaseItems: 45,
    createdAt: '2024-01-15',
    lastUpdated: '2024-01-20'
  },
  {
    id: '2',
    name: 'Product Advisor',
    description: 'Provides product recommendations and technical guidance',
    model: 'claude-3-sonnet',
    status: 'active',
    conversationsCount: 892,
    knowledgeBaseItems: 78,
    createdAt: '2024-01-10',
    lastUpdated: '2024-01-19'
  },
  {
    id: '3',
    name: 'Sales Assistant',
    description: 'Assists with sales inquiries and lead qualification',
    model: 'gpt-4',
    status: 'training',
    conversationsCount: 0,
    knowledgeBaseItems: 23,
    createdAt: '2024-01-22',
    lastUpdated: '2024-01-22'
  }
];

const modelOptions = [
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
];

export function ChatbotsManagement() {
  const [chatbots, setChatbots] = useState<Chatbot[]>(mockChatbots);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingChatbot, setEditingChatbot] = useState<Chatbot | null>(null);
  const [formData, setFormData] = useState<ChatbotFormData>({
    name: '',
    description: '',
    model: 'claude-3-haiku',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 1000
  });

  const filteredChatbots = chatbots.filter(chatbot => {
    const matchesSearch = chatbot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chatbot.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || chatbot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateChatbot = () => {
    const newChatbot: Chatbot = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      model: formData.model,
      status: 'inactive',
      conversationsCount: 0,
      knowledgeBaseItems: 0,
      createdAt: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setChatbots([...chatbots, newChatbot]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEditChatbot = () => {
    if (!editingChatbot) return;

    setChatbots(chatbots.map(bot =>
      bot.id === editingChatbot.id
        ? {
            ...bot,
            name: formData.name,
            description: formData.description,
            model: formData.model,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : bot
    ));

    setIsEditDialogOpen(false);
    setEditingChatbot(null);
    resetForm();
  };

  const handleDeleteChatbot = (id: string) => {
    setChatbots(chatbots.filter(bot => bot.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setChatbots(chatbots.map(bot =>
      bot.id === id
        ? {
            ...bot,
            status: bot.status === 'active' ? 'inactive' : 'active',
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : bot
    ));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      model: 'claude-3-haiku',
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 1000
    });
  };

  const openEditDialog = (chatbot: Chatbot) => {
    setEditingChatbot(chatbot);
    setFormData({
      name: chatbot.name,
      description: chatbot.description,
      model: chatbot.model,
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 1000
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'training':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Training</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chatbots</h2>
          <p className="text-muted-foreground">
            Manage your AI chatbot instances and configurations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Chatbot
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Chatbot</DialogTitle>
              <DialogDescription>
                Configure a new AI chatbot instance with custom settings and model selection.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="col-span-3"
                  placeholder="Customer Support Bot"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="col-span-3"
                  placeholder="Describe the chatbot's purpose and functionality"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="model" className="text-right">
                  Model
                </Label>
                <Select value={formData.model} onValueChange={(value) => setFormData({...formData, model: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="systemPrompt" className="text-right">
                  System Prompt
                </Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({...formData, systemPrompt: e.target.value})}
                  className="col-span-3"
                  placeholder="You are a helpful assistant that..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateChatbot} disabled={!formData.name || !formData.description}>
                Create Chatbot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chatbots..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Chatbots Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chatbot Instances</CardTitle>
          <CardDescription>
            {filteredChatbots.length} chatbot{filteredChatbots.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead className="text-right">Knowledge Items</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChatbots.map((chatbot) => (
                  <TableRow key={chatbot.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{chatbot.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {chatbot.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {modelOptions.find(m => m.value === chatbot.model)?.label || chatbot.model}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(chatbot.status)}</TableCell>
                    <TableCell className="text-right">{chatbot.conversationsCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{chatbot.knowledgeBaseItems}</TableCell>
                    <TableCell>{chatbot.lastUpdated}</TableCell>
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
                          <DropdownMenuItem onClick={() => openEditDialog(chatbot)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(chatbot.id)}>
                            {chatbot.status === 'active' ? (
                              <>
                                <Pause className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            View Conversations
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
                                  This action cannot be undone. This will permanently delete the chatbot
                                  "{chatbot.name}" and all associated conversation data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteChatbot(chatbot.id)}
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
          {filteredChatbots.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No chatbots found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Chatbot</DialogTitle>
            <DialogDescription>
              Update the chatbot configuration and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-model" className="text-right">
                Model
              </Label>
              <Select value={formData.model} onValueChange={(value) => setFormData({...formData, model: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditChatbot} disabled={!formData.name || !formData.description}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}