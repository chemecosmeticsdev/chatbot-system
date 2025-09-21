'use client';

import { useState, useCallback } from 'react';
import { DashboardPage, DashboardSection } from '@/components/ui/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  EyeIcon,
  TrashIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';

interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  created_at: string;
  updated_at: string;
  product_id?: string;
  product_name?: string;
  pages?: number;
  ocr_status?: 'pending' | 'completed' | 'failed';
  vector_status?: 'pending' | 'completed' | 'failed';
}

interface DocumentUploadProps {
  onFileSelect: (files: FileList) => void;
  uploading: boolean;
}

function DocumentUpload({ onFileSelect, uploading }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files);
    }
  }, [onFileSelect]);

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${dragActive
          ? 'border-primary bg-primary/5'
          : 'border-gray-300 hover:border-gray-400'
        }
        ${uploading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={uploading}
      />

      <div className="space-y-4">
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div>
          <p className="text-lg font-medium text-gray-900">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Support for PDF, DOC, DOCX, TXT, JPG, PNG files up to 10MB
          </p>
        </div>
        <Button variant="outline" disabled={uploading}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Select Files'}
        </Button>
      </div>
    </div>
  );
}

interface DocumentListProps {
  documents: DocumentFile[];
  onView: (document: DocumentFile) => void;
  onDelete: (documentId: string) => void;
}

function DocumentList({ documents, onView, onDelete }: DocumentListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getFileTypeIcon = (type: string) => {
    if (type.includes('image')) {
      return <PhotoIcon className="h-8 w-8 text-blue-500" />;
    } else if (type.includes('pdf')) {
      return <DocumentTextIcon className="h-8 w-8 text-red-500" />;
    } else {
      return <DocumentIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusText = (document: DocumentFile) => {
    switch (document.status) {
      case 'uploading':
        return `Uploading... ${document.progress}%`;
      case 'processing':
        return 'Processing document...';
      case 'completed':
        return `OCR: ${document.ocr_status || 'pending'} • Vector: ${document.vector_status || 'pending'}`;
      case 'error':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <Card key={document.id} className="p-6">
          <div className="flex items-start space-x-4">
            {/* File type icon */}
            <div className="flex-shrink-0">
              {getFileTypeIcon(document.type)}
            </div>

            {/* Document info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {document.name}
                </h3>
                {getStatusIcon(document.status)}
              </div>

              <div className="mt-1 text-sm text-gray-500 space-y-1">
                <div className="flex items-center space-x-4">
                  <span>{formatFileSize(document.size)}</span>
                  <span>•</span>
                  <span>{document.type}</span>
                  {document.pages && (
                    <>
                      <span>•</span>
                      <span>{document.pages} pages</span>
                    </>
                  )}
                </div>

                <div>{getStatusText(document)}</div>

                {document.product_name && (
                  <div className="flex items-center space-x-1">
                    <span>Product:</span>
                    <span className="font-medium text-primary">
                      {document.product_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar for uploading/processing */}
              {(document.status === 'uploading' || document.status === 'processing') && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${document.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(document)}
                title="View details"
                disabled={document.status === 'uploading'}
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(document.id)}
                title="Delete document"
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Created/Updated times */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Uploaded: {new Date(document.created_at).toLocaleString()}</span>
              <span>Updated: {new Date(document.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Documents Management Page
 *
 * Provides comprehensive document management functionality including:
 * - Drag-and-drop file upload interface
 * - Document processing status tracking
 * - OCR and vector processing pipeline status
 * - File type validation and preview
 * - Document search and filtering
 */
export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Mock data for demonstration
  React.useEffect(() => {
    const mockDocuments: DocumentFile[] = [
      {
        id: '1',
        name: 'Customer Service Manual.pdf',
        type: 'application/pdf',
        size: 2457600,
        status: 'completed',
        progress: 100,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:05:00Z',
        product_id: '1',
        product_name: 'Customer Support Knowledge Base',
        pages: 45,
        ocr_status: 'completed',
        vector_status: 'completed'
      },
      {
        id: '2',
        name: 'API Documentation.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1536000,
        status: 'processing',
        progress: 75,
        created_at: '2024-01-20T09:30:00Z',
        updated_at: '2024-01-20T09:35:00Z',
        product_id: '2',
        product_name: 'Product Documentation',
        pages: 23,
        ocr_status: 'completed',
        vector_status: 'pending'
      },
      {
        id: '3',
        name: 'Training Slides.png',
        type: 'image/png',
        size: 3072000,
        status: 'error',
        progress: 0,
        created_at: '2024-01-18T14:20:00Z',
        updated_at: '2024-01-18T14:22:00Z',
        product_id: '3',
        product_name: 'Internal Training Materials',
        ocr_status: 'failed',
        vector_status: 'pending'
      }
    ];

    setTimeout(() => {
      setDocuments(mockDocuments);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredDocuments = documents.filter(document => {
    const matchesSearch = document.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         document.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || document.status === statusFilter;
    const matchesType = typeFilter === 'all' || document.type.includes(typeFilter);

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleFileSelect = async (files: FileList) => {
    setUploading(true);

    // Simulate file upload process
    const newDocuments: DocumentFile[] = Array.from(files).map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading' as const,
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setDocuments(prev => [...newDocuments, ...prev]);

    // Simulate upload progress
    for (const doc of newDocuments) {
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setDocuments(prev => prev.map(d =>
          d.id === doc.id ? { ...d, progress } : d
        ));
      }

      // Switch to processing
      setDocuments(prev => prev.map(d =>
        d.id === doc.id ? {
          ...d,
          status: 'processing',
          progress: 50,
          ocr_status: 'pending',
          vector_status: 'pending'
        } : d
      ));

      // Complete processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDocuments(prev => prev.map(d =>
        d.id === doc.id ? {
          ...d,
          status: 'completed',
          progress: 100,
          ocr_status: 'completed',
          vector_status: 'completed',
          pages: Math.floor(Math.random() * 50) + 1
        } : d
      ));
    }

    setUploading(false);
  };

  const handleView = (document: DocumentFile) => {
    console.log('View document:', document);
    // TODO: Implement document viewer
  };

  const handleDelete = (documentId: string) => {
    console.log('Delete document:', documentId);
    setDocuments(prev => prev.filter(d => d.id !== documentId));
  };

  return (
    <ChatbotErrorBoundary
      tags={{ page: 'documents' }}
      context={{ documents_count: documents.length, filtered_count: filteredDocuments.length }}
    >
      <DashboardPage
        title="Documents"
        description="Upload and manage documents for your knowledge base"
      >
        {/* Upload Section */}
        <DashboardSection>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Upload Documents</h3>
            <DocumentUpload onFileSelect={handleFileSelect} uploading={uploading} />
          </div>
        </DashboardSection>

        {/* Filters and Search */}
        <DashboardSection>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="uploading">Uploading</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="error">Error</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="pdf">PDF</option>
                <option value="doc">Word</option>
                <option value="image">Images</option>
                <option value="text">Text</option>
              </select>
            </div>
          </div>
        </DashboardSection>

        {/* Documents List */}
        <DashboardSection>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4 text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No documents match your filters'
                  : 'No documents uploaded yet. Upload your first document to get started.'
                }
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Showing {filteredDocuments.length} of {documents.length} documents
              </div>
              <DocumentList
                documents={filteredDocuments}
                onView={handleView}
                onDelete={handleDelete}
              />
            </div>
          )}
        </DashboardSection>
      </DashboardPage>
    </ChatbotErrorBoundary>
  );
}