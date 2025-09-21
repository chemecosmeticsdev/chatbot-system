'use client';

import { useState } from 'react';
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
  Search,
  Filter,
  MoreHorizontal,
  Package,
  ShoppingCart,
  Star,
  DollarSign,
  TrendingUp,
  Eye,
  Copy
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
import { Switch } from '@/components/ui/switch';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  sku: string;
  status: 'active' | 'inactive' | 'discontinued';
  stock: number;
  rating: number;
  reviewsCount: number;
  documentsCount: number;
  createdAt: string;
  lastUpdated: string;
  isPromoted: boolean;
  tags: string[];
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  sku: string;
  stock: number;
  isPromoted: boolean;
  tags: string;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Smart Home Hub Pro',
    description: 'Advanced smart home automation hub with AI voice control',
    category: 'Electronics',
    price: 299.99,
    currency: 'USD',
    sku: 'SHH-PRO-001',
    status: 'active',
    stock: 150,
    rating: 4.8,
    reviewsCount: 234,
    documentsCount: 8,
    createdAt: '2024-01-10',
    lastUpdated: '2024-01-20',
    isPromoted: true,
    tags: ['smart-home', 'ai', 'voice-control', 'automation']
  },
  {
    id: '2',
    name: 'Wireless Security Camera',
    description: '4K wireless security camera with night vision and motion detection',
    category: 'Security',
    price: 199.99,
    currency: 'USD',
    sku: 'WSC-4K-002',
    status: 'active',
    stock: 75,
    rating: 4.6,
    reviewsCount: 189,
    documentsCount: 5,
    createdAt: '2024-01-05',
    lastUpdated: '2024-01-18',
    isPromoted: false,
    tags: ['security', '4k', 'wireless', 'night-vision']
  },
  {
    id: '3',
    name: 'Smart Doorbell',
    description: 'Video doorbell with two-way audio and smartphone notifications',
    category: 'Security',
    price: 149.99,
    currency: 'USD',
    sku: 'SDB-VID-003',
    status: 'active',
    stock: 0,
    rating: 4.4,
    reviewsCount: 156,
    documentsCount: 3,
    createdAt: '2023-12-20',
    lastUpdated: '2024-01-15',
    isPromoted: false,
    tags: ['doorbell', 'video', 'audio', 'notifications']
  },
  {
    id: '4',
    name: 'Legacy Control Panel',
    description: 'Old generation control panel - discontinued model',
    category: 'Electronics',
    price: 89.99,
    currency: 'USD',
    sku: 'LCP-OLD-004',
    status: 'discontinued',
    stock: 5,
    rating: 3.9,
    reviewsCount: 45,
    documentsCount: 2,
    createdAt: '2023-06-15',
    lastUpdated: '2023-12-01',
    isPromoted: false,
    tags: ['legacy', 'discontinued', 'control-panel']
  }
];

const productCategories = [
  'Electronics', 'Security', 'Lighting', 'Climate', 'Audio', 'Accessories', 'Software', 'Services'
];

const currencies = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'THB', label: 'Thai Baht (฿)' }
];

export function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category: '',
    price: 0,
    currency: 'USD',
    sku: '',
    stock: 0,
    isPromoted: false,
    tags: ''
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      category: formData.category,
      price: formData.price,
      currency: formData.currency,
      sku: formData.sku,
      status: 'active',
      stock: formData.stock,
      rating: 0,
      reviewsCount: 0,
      documentsCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
      isPromoted: formData.isPromoted,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };

    setProducts([...products, newProduct]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEditProduct = () => {
    if (!editingProduct) return;

    setProducts(products.map(product =>
      product.id === editingProduct.id
        ? {
            ...product,
            name: formData.name,
            description: formData.description,
            category: formData.category,
            price: formData.price,
            currency: formData.currency,
            sku: formData.sku,
            stock: formData.stock,
            isPromoted: formData.isPromoted,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : product
    ));

    setIsEditDialogOpen(false);
    setEditingProduct(null);
    resetForm();
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setProducts(products.map(product =>
      product.id === id
        ? {
            ...product,
            status: product.status === 'active' ? 'inactive' : 'active',
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : product
    ));
  };

  const handleTogglePromotion = (id: string) => {
    setProducts(products.map(product =>
      product.id === id
        ? {
            ...product,
            isPromoted: !product.isPromoted,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : product
    ));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      price: 0,
      currency: 'USD',
      sku: '',
      stock: 0,
      isPromoted: false,
      tags: ''
    });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      currency: product.currency,
      sku: product.sku,
      stock: product.stock,
      isPromoted: product.isPromoted,
      tags: product.tags.join(', ')
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'discontinued':
        return <Badge variant="destructive">Discontinued</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stock < 10) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Low Stock</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>;
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      THB: '฿'
    };

    return `${currencySymbols[currency] || currency} ${price.toFixed(2)}`;
  };

  const generateSKU = () => {
    const prefix = formData.name.split(' ').map(word => word.charAt(0).toUpperCase()).join('');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${randomNum}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">
            Manage your product catalog and inventory
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Create a new product entry for your catalog with detailed information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="col-span-3"
                  placeholder="Smart Home Hub Pro"
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
                  placeholder="Detailed product description..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    className="flex-1"
                    placeholder="299.99"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sku" className="text-right">
                  SKU
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="flex-1"
                    placeholder="SHH-PRO-001"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({...formData, sku: generateSKU()})}
                    disabled={!formData.name}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock" className="text-right">
                  Stock
                </Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                  className="col-span-3"
                  placeholder="150"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tags" className="text-right">
                  Tags
                </Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  className="col-span-3"
                  placeholder="smart-home, ai, voice-control"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="promoted" className="text-right">
                  Promoted
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch
                    id="promoted"
                    checked={formData.isPromoted}
                    onCheckedChange={(checked) => setFormData({...formData, isPromoted: checked})}
                  />
                  <Label htmlFor="promoted" className="text-sm text-muted-foreground">
                    Feature this product in promotions
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProduct} disabled={!formData.name || !formData.category || !formData.sku}>
                Add Product
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
                placeholder="Search products..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{product.name}</div>
                          {product.isPromoted && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                              <Star className="w-3 h-3 mr-1" />
                              Promoted
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {product.sku}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {product.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatPrice(product.price, product.currency)}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{product.stock}</div>
                        {getStockBadge(product.stock)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{product.rating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">({product.reviewsCount})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <span className="font-medium">{product.documentsCount}</span>
                      </div>
                    </TableCell>
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
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(product)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.sku)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy SKU
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(product.id)}>
                            {product.status === 'active' ? (
                              <>
                                <Package className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePromotion(product.id)}>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            {product.isPromoted ? 'Remove Promotion' : 'Promote Product'}
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
                                  This action cannot be undone. This will permanently delete the product
                                  "{product.name}" and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteProduct(product.id)}
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
          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No products found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product information and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
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
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-price" className="text-right">
                Price
              </Label>
              <div className="col-span-3 flex gap-2">
                <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-stock" className="text-right">
                Stock
              </Label>
              <Input
                id="edit-stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-tags" className="text-right">
                Tags
              </Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-promoted" className="text-right">
                Promoted
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="edit-promoted"
                  checked={formData.isPromoted}
                  onCheckedChange={(checked) => setFormData({...formData, isPromoted: checked})}
                />
                <Label htmlFor="edit-promoted" className="text-sm text-muted-foreground">
                  Feature this product in promotions
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditProduct} disabled={!formData.name || !formData.category}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}