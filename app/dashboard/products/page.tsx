'use client';

import { useState, useEffect } from 'react';
import { DashboardPage, DashboardSection } from '@/components/ui/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';
import { ProductCreateForm } from '@/components/forms/ProductCreateForm';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
  document_count?: number;
}

interface ProductsListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onView: (product: Product) => void;
}

function ProductsList({ products, onEdit, onDelete, onView }: ProductsListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {product.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {product.sku}
              </p>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {product.description}
              </p>
            </div>
            <div className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${product.status === 'active' ? 'bg-green-100 text-green-800' :
                product.status === 'inactive' ? 'bg-red-100 text-red-800' :
                product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'}
            `}>
              {product.status}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <span className="font-medium">{product.category}</span>
              {product.document_count !== undefined && (
                <span className="ml-2">• {product.document_count} docs</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(product)}
                title="View details"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(product)}
                title="Edit product"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(product.id)}
                title="Delete product"
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-400">
            Created: {new Date(product.created_at).toLocaleDateString()}
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Products Management Page
 *
 * Provides comprehensive product management functionality including:
 * - Product listing with search and filtering
 * - Product creation, editing, and deletion
 * - Status management and category organization
 * - Document association tracking
 */
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Customer Support Knowledge Base',
        description: 'Comprehensive support documentation and FAQs for customer service team',
        category: 'Support',
        sku: 'SUP-001',
        status: 'active',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-20T15:30:00Z',
        document_count: 45
      },
      {
        id: '2',
        name: 'Product Documentation',
        description: 'Technical product specifications and user manuals',
        category: 'Documentation',
        sku: 'DOC-001',
        status: 'active',
        created_at: '2024-01-10T09:00:00Z',
        updated_at: '2024-01-18T11:20:00Z',
        document_count: 23
      },
      {
        id: '3',
        name: 'Internal Training Materials',
        description: 'Employee onboarding and training documentation',
        category: 'Training',
        sku: 'TRN-001',
        status: 'draft',
        created_at: '2024-01-20T14:00:00Z',
        updated_at: '2024-01-20T14:00:00Z',
        document_count: 8
      }
    ];

    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleEdit = (product: Product) => {
    console.log('Edit product:', product);
    // TODO: Implement edit functionality
  };

  const handleDelete = (productId: string) => {
    console.log('Delete product:', productId);
    // TODO: Implement delete functionality with confirmation
  };

  const handleView = (product: Product) => {
    console.log('View product:', product);
    // TODO: Implement view details functionality
  };

  const handleCreateNew = () => {
    setShowCreateForm(true);
  };

  const handleCreateProduct = async (productData: any) => {
    setCreateLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newProduct: Product = {
        id: `${Date.now()}`,
        name: productData.name,
        description: productData.description,
        category: productData.category,
        sku: productData.sku,
        status: productData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document_count: 0,
      };

      setProducts(prev => [newProduct, ...prev]);
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <ChatbotErrorBoundary
      tags={{ page: 'products' }}
      context={{ products_count: products.length, filtered_count: filteredProducts.length }}
    >
      <DashboardPage
        title="Products"
        description="Manage your knowledge base products and their associated documents"
        action={
          <Button onClick={handleCreateNew}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Product
          </Button>
        }
      >
        {/* Filters and Search */}
        <DashboardSection>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search products..."
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                <option value="Support">Support</option>
                <option value="Documentation">Documentation</option>
                <option value="Training">Training</option>
              </select>
            </div>
          </div>
        </DashboardSection>

        {/* Products List */}
        <DashboardSection>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No products match your filters'
                  : 'No products found. Create your first product to get started.'
                }
              </div>
              {(!searchTerm && statusFilter === 'all' && categoryFilter === 'all') && (
                <Button className="mt-4" onClick={handleCreateNew}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Showing {filteredProducts.length} of {products.length} products
              </div>
              <ProductsList
                products={filteredProducts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />
            </div>
          )}
        </DashboardSection>

        {/* Create Product Form */}
        <ProductCreateForm
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateProduct}
          loading={createLoading}
        />
      </DashboardPage>
    </ChatbotErrorBoundary>
  );
}