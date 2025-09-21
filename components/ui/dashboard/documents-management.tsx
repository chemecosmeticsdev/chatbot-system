'use client';

import { useState, useCallback } from 'react';
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
  Upload,
  Edit2,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  FileText,
  Image,
  Download,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock
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
import { Progress } from '@/components/ui/progress';

interface Document {
  id: string;
  name: string;
  description: string;
  type: 'pdf' | 'docx' | 'txt' | 'image' | 'csv';
  size: number;
  status: 'processing' | 'completed' | 'failed' | 'pending';
  uploadedAt: string;
  processedAt?: string;
  chunks: number;
  productCategory?: string;
  extractedText?: string;
  ocrProgress?: number;
}

interface DocumentFormData {
  name: string;
  description: string;
  productCategory: string;
  file?: File;
}

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Product Manual v2.1.pdf',
    description: 'Complete product manual with installation guides',
    type: 'pdf',
    size: 2048576, // 2MB
    status: 'completed',
    uploadedAt: '2024-01-15T10:30:00Z',
    processedAt: '2024-01-15T10:35:00Z',
    chunks: 45,
    productCategory: 'Electronics'
  },
  {
    id: '2',
    name: 'FAQ Database.docx',
    description: 'Frequently asked questions and answers',
    type: 'docx',
    size: 512000, // 500KB
    status: 'completed',
    uploadedAt: '2024-01-14T14:20:00Z',
    processedAt: '2024-01-14T14:22:00Z',
    chunks: 28,
    productCategory: 'Support'
  },
  {
    id: '3',
    name: 'Product Image Catalog.pdf',
    description: 'Visual catalog with product descriptions',
    type: 'pdf',
    size: 5242880, // 5MB
    status: 'processing',
    uploadedAt: '2024-01-22T09:15:00Z',
    chunks: 0,
    productCategory: 'Marketing',
    ocrProgress: 65
  },
  {
    id: '4',
    name: 'Technical Specifications.txt',
    description: 'Detailed technical specifications and requirements',
    type: 'txt',
    size: 102400, // 100KB
    status: 'failed',
    uploadedAt: '2024-01-20T16:45:00Z',
    chunks: 0,
    productCategory: 'Technical'
  }
];

const documentTypes = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'docx', label: 'Word Document', icon: FileText },
  { value: 'txt', label: 'Text File', icon: FileText },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'csv', label: 'CSV', icon: FileText }
];

const productCategories = [
  'Electronics', 'Software', 'Hardware', 'Support', 'Marketing', 'Technical', 'Legal', 'Training'
];

export function DocumentsManagement() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<DocumentFormData>({
    name: '',
    description: '',
    productCategory: '',
    file: undefined
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.productCategory && doc.productCategory.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        file,
        name: prev.name || file.name
      }));
    }
  }, []);

  const handleUploadDocument = async () => {
    if (!formData.file) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate upload completion
    setTimeout(() => {
      const newDocument: Document = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        type: getFileType(formData.file!.name),
        size: formData.file!.size,
        status: 'processing',
        uploadedAt: new Date().toISOString(),
        chunks: 0,
        productCategory: formData.productCategory,
        ocrProgress: 0
      };

      setDocuments(prev => [newDocument, ...prev]);
      setIsUploadDialogOpen(false);
      setIsUploading(false);
      setUploadProgress(0);
      resetForm();

      // Simulate processing completion
      setTimeout(() => {
        setDocuments(prev => prev.map(doc =>
          doc.id === newDocument.id
            ? {
                ...doc,
                status: 'completed',
                processedAt: new Date().toISOString(),
                chunks: Math.floor(Math.random() * 50) + 10
              }
            : doc
        ));
      }, 3000);
    }, 2000);
  };

  const handleEditDocument = () => {
    if (!editingDocument) return;

    setDocuments(documents.map(doc =>
      doc.id === editingDocument.id
        ? {
            ...doc,
            name: formData.name,
            description: formData.description,
            productCategory: formData.productCategory
          }
        : doc
    ));

    setIsEditDialogOpen(false);
    setEditingDocument(null);
    resetForm();
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  const handleReprocessDocument = (id: string) => {
    setDocuments(documents.map(doc =>
      doc.id === id
        ? {
            ...doc,
            status: 'processing',
            chunks: 0,
            ocrProgress: 0
          }
        : doc
    ));

    // Simulate reprocessing
    setTimeout(() => {
      setDocuments(prev => prev.map(doc =>
        doc.id === id
          ? {
              ...doc,
              status: 'completed',
              processedAt: new Date().toISOString(),
              chunks: Math.floor(Math.random() * 50) + 10
            }
          : doc
      ));
    }, 3000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      productCategory: '',
      file: undefined
    });
  };

  const openEditDialog = (document: Document) => {
    setEditingDocument(document);
    setFormData({
      name: document.name,
      description: document.description,
      productCategory: document.productCategory || '',
      file: undefined
    });
    setIsEditDialogOpen(true);
  };

  const getFileType = (filename: string): Document['type'] => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'docx':
      case 'doc':
        return 'docx';
      case 'txt':
        return 'txt';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'csv':
        return 'csv';
      default:
        return 'txt';
    }
  };

  const getStatusBadge = (status: string, ocrProgress?: number) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Processing {ocrProgress ? `${ocrProgress}%` : ''}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  return (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">
            Manage your knowledge base documents and content
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
              <DialogDescription>
                Upload a document to add to your knowledge base. Supported formats: PDF, Word, Text, Images, CSV.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">
                  File
                </Label>
                <div className="col-span-3">
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.doc,.txt,.csv,.jpg,.jpeg,.png,.gif"
                    className="cursor-pointer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="col-span-3"
                  placeholder="Document name"
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
                  placeholder="Describe the document content and purpose"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select value={formData.productCategory} onValueChange={(value) => setFormData({...formData, productCategory: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isUploading && (
                <div className="col-span-4">
                  <Label>Upload Progress</Label>
                  <Progress value={uploadProgress} className="mt-2" />
                  <p className="text-sm text-muted-foreground mt-1">{uploadProgress}% complete</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUploadDocument}
                disabled={!formData.file || !formData.name || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
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
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Chunks</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{document.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {document.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {documentTypes.find(t => t.value === document.type)?.icon && (
                          <span className="w-3 h-3">
                            {(() => {
                              const IconComponent = documentTypes.find(t => t.value === document.type)?.icon;
                              return IconComponent ? <IconComponent className="w-3 h-3" /> : null;
                            })()}
                          </span>
                        )}
                        {document.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(document.status, document.ocrProgress)}</TableCell>
                    <TableCell>
                      {document.productCategory && (
                        <Badge variant="secondary">{document.productCategory}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatFileSize(document.size)}</TableCell>
                    <TableCell className="text-right">{document.chunks}</TableCell>
                    <TableCell>{formatDate(document.uploadedAt)}</TableCell>
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
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Content
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(document)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          {(document.status === 'failed' || document.status === 'completed') && (
                            <DropdownMenuItem onClick={() => handleReprocessDocument(document.id)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reprocess
                            </DropdownMenuItem>
                          )}
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
                                  This action cannot be undone. This will permanently delete the document
                                  "{document.name}" and all associated embeddings.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDocument(document.id)}
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
          {filteredDocuments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No documents found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update the document metadata and categorization.
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
              <Label htmlFor="edit-category" className="text-right">
                Category
              </Label>
              <Select value={formData.productCategory} onValueChange={(value) => setFormData({...formData, productCategory: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
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
            <Button onClick={handleEditDocument} disabled={!formData.name}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}