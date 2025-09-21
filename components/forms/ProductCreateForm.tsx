'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  sku: string;
  status: 'active' | 'inactive' | 'draft';
  tags: string[];
  metadata: {
    target_audience?: string;
    language?: 'en' | 'th' | 'both';
    priority?: 'low' | 'medium' | 'high';
    department?: string;
  };
}

interface ProductCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  loading?: boolean;
}

export function ProductCreateForm({ isOpen, onClose, onSubmit, loading = false }: ProductCreateFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      description: '',
      category: '',
      sku: '',
      status: 'draft',
      tags: [],
      metadata: {
        language: 'both',
        priority: 'medium',
      },
    },
    mode: 'onChange',
  });

  const watchedData = watch();

  const handleFormSubmit = async (data: ProductFormData) => {
    try {
      setSubmitStatus('idle');
      await onSubmit({ ...data, tags });
      setSubmitStatus('success');

      // Reset form after successful submission
      setTimeout(() => {
        reset();
        setTags([]);
        setCurrentStep(1);
        setSubmitStatus('idle');
        onClose();
      }, 1500);
    } catch (error) {
      setSubmitStatus('error');
    }
  };

  const handleClose = () => {
    reset();
    setTags([]);
    setCurrentStep(1);
    setSubmitStatus('idle');
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const generateSKU = () => {
    const category = getValues('category');
    const name = getValues('name');

    if (category && name) {
      const categoryCode = category.substring(0, 3).toUpperCase();
      const nameCode = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const sku = `${categoryCode}-${nameCode}-${randomNum}`;
      setValue('sku', sku);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getStepProgress = () => {
    return ((currentStep - 1) / 2) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />

        {/* Modal */}
        <div className="relative w-full max-w-2xl">
          <ChatbotErrorBoundary
            tags={{ component: 'product_create_form' }}
            context={{ step: currentStep, form_data: watchedData }}
          >
            <Card className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Create New Product</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Add a new product to your knowledge base
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress indicator */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Step {currentStep} of 3
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(getStepProgress())}% Complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getStepProgress()}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span className={currentStep >= 1 ? 'text-primary font-medium' : ''}>
                    Basic Info
                  </span>
                  <span className={currentStep >= 2 ? 'text-primary font-medium' : ''}>
                    Configuration
                  </span>
                  <span className={currentStep >= 3 ? 'text-primary font-medium' : ''}>
                    Review
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name *
                      </label>
                      <Input
                        {...register('name', {
                          required: 'Product name is required',
                          minLength: { value: 3, message: 'Name must be at least 3 characters' }
                        })}
                        placeholder="e.g., Customer Support Knowledge Base"
                        className={errors.name ? 'border-red-300' : ''}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        {...register('description', {
                          required: 'Description is required',
                          minLength: { value: 10, message: 'Description must be at least 10 characters' }
                        })}
                        rows={3}
                        placeholder="Describe what this product contains and its purpose..."
                        className={`w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                          errors.description ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category *
                        </label>
                        <select
                          {...register('category', { required: 'Category is required' })}
                          className={`w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                            errors.category ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select category...</option>
                          <option value="Support">Customer Support</option>
                          <option value="Documentation">Documentation</option>
                          <option value="Training">Training</option>
                          <option value="Sales">Sales & Marketing</option>
                          <option value="Technical">Technical</option>
                          <option value="HR">Human Resources</option>
                          <option value="Finance">Finance</option>
                          <option value="Other">Other</option>
                        </select>
                        {errors.category && (
                          <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SKU *
                        </label>
                        <div className="flex space-x-2">
                          <Input
                            {...register('sku', {
                              required: 'SKU is required',
                              pattern: {
                                value: /^[A-Z0-9-]+$/,
                                message: 'SKU must contain only uppercase letters, numbers, and hyphens'
                              }
                            })}
                            placeholder="PRD-001"
                            className={errors.sku ? 'border-red-300' : ''}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={generateSKU}
                            disabled={!watchedData.name || !watchedData.category}
                          >
                            Generate
                          </Button>
                        </div>
                        {errors.sku && (
                          <p className="text-sm text-red-600 mt-1">{errors.sku.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex">
                        <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700">
                          <p className="font-medium">Product Organization Tips</p>
                          <ul className="mt-1 space-y-1">
                            <li>• Choose a clear, descriptive name that reflects the content</li>
                            <li>• Select the most appropriate category for better organization</li>
                            <li>• SKU should be unique and follow your naming convention</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Configuration */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        {...register('status')}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Draft products are not visible to chatbots until activated
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Language Support
                        </label>
                        <select
                          {...register('metadata.language')}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="en">English Only</option>
                          <option value="th">Thai Only</option>
                          <option value="both">Thai & English</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          {...register('metadata.priority')}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Audience
                        </label>
                        <Input
                          {...register('metadata.target_audience')}
                          placeholder="e.g., Customer service agents"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <Input
                          {...register('metadata.department')}
                          placeholder="e.g., Customer Support"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags
                      </label>
                      <div className="flex space-x-2 mb-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag..."
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={addTag}>
                          Add
                        </Button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 text-primary/60 hover:text-primary"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Review */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Review Product Details</h3>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Name:</span>
                          <p className="text-sm text-gray-900">{watchedData.name}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">SKU:</span>
                          <p className="text-sm text-gray-900">{watchedData.sku}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Category:</span>
                          <p className="text-sm text-gray-900">{watchedData.category}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Status:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            watchedData.status === 'active' ? 'bg-green-100 text-green-800' :
                            watchedData.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {watchedData.status}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-700">Description:</span>
                        <p className="text-sm text-gray-900 mt-1">{watchedData.description}</p>
                      </div>

                      {tags.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Tags:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {submitStatus === 'error' && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                          <div className="text-sm text-red-700">
                            <p className="font-medium">Error creating product</p>
                            <p>Please check your information and try again.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {submitStatus === 'success' && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex">
                          <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
                          <div className="text-sm text-green-700">
                            <p className="font-medium">Product created successfully!</p>
                            <p>You can now start uploading documents to this product.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <div className="flex space-x-2">
                    {currentStep > 1 && (
                      <Button type="button" variant="outline" onClick={prevStep}>
                        Previous
                      </Button>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button type="button" variant="ghost" onClick={handleClose}>
                      Cancel
                    </Button>
                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={
                          (currentStep === 1 && (!watchedData.name || !watchedData.description || !watchedData.category || !watchedData.sku)) ||
                          !isValid
                        }
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={loading || !isValid || submitStatus === 'success'}
                      >
                        {loading ? 'Creating...' : submitStatus === 'success' ? 'Created!' : 'Create Product'}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Card>
          </ChatbotErrorBoundary>
        </div>
      </div>
    </div>
  );
}