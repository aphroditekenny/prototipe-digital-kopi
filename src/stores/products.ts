import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProductState, ProductActions, ProductGetters } from '@/types/stores'
import type { Product, ProductVariant } from '@/types/api'

export const useProductStore = defineStore('products', () => {
  // State
  const products = ref<Product[]>([])
  const categories = ref<string[]>([])
  const selectedProduct = ref<Product | null>(null)
  const selectedVariant = ref<ProductVariant | null>(null)
  const activeColor = ref('#8B4513') // Coffee brown
  const activeMaterial = ref('ceramic')
  const viewMode = ref<'3d' | 'gallery' | 'details'>('3d')
  const isLoading = ref(false)
  const loadingStates = ref(new Map<string, boolean>())

  const filters = ref({
    category: [],
    priceRange: [0, 1000] as [number, number],
    colors: [],
    materials: [],
    inStock: true,
    featured: false,
    onSale: false
  })

  const searchQuery = ref('')

  // Mock data for initial development
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Classic Coffee Cup',
      category: 'Cups',
      subcategory: 'Ceramic',
      description: 'A beautiful handcrafted ceramic coffee cup with perfect weight and balance.',
      price: 25.99,
      currency: 'USD',
      stock: 50,
      images: ['/images/coffee-cup-1.jpg'],
      model3D: '/models/coffee-cup-lod0.glb',
      variants: [
        {
          id: '1-1',
          name: 'Classic Brown',
          color: 'Brown',
          colorCode: '#8B4513',
          material: 'ceramic',
          price: 25.99,
          stock: 20,
          model3D: '/models/coffee-cup-brown.glb',
          thumbnail: '/images/cup-brown-thumb.jpg'
        },
        {
          id: '1-2',
          name: 'Elegant White',
          color: 'White',
          colorCode: '#FFFFFF',
          material: 'ceramic',
          price: 25.99,
          stock: 15,
          model3D: '/models/coffee-cup-white.glb',
          thumbnail: '/images/cup-white-thumb.jpg'
        },
        {
          id: '1-3',
          name: 'Modern Black',
          color: 'Black',
          colorCode: '#2C2C2C',
          material: 'ceramic',
          price: 27.99,
          stock: 25,
          model3D: '/models/coffee-cup-black.glb',
          thumbnail: '/images/cup-black-thumb.jpg'
        }
      ],
      attributes: [
        { key: 'capacity', value: 350, unit: 'ml', displayName: 'Capacity' },
        { key: 'dishwasher_safe', value: true, displayName: 'Dishwasher Safe' },
        { key: 'microwave_safe', value: true, displayName: 'Microwave Safe' }
      ],
      metadata: {
        tags: ['coffee', 'ceramic', 'handmade'],
        featured: true,
        popular: true,
        newArrival: false,
        onSale: false,
        seoTitle: 'Classic Ceramic Coffee Cup - Handcrafted Quality',
        seoDescription: 'Experience the perfect coffee moment with our handcrafted ceramic cups.'
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'Premium Coffee Beans',
      category: 'Beans',
      subcategory: 'Arabica',
      description: 'Single origin Arabica beans with rich flavor and aroma.',
      price: 18.50,
      currency: 'USD',
      stock: 100,
      images: ['/images/coffee-beans-1.jpg'],
      model3D: '/models/coffee-beans.glb',
      variants: [
        {
          id: '2-1',
          name: 'Light Roast',
          color: 'Light Brown',
          colorCode: '#D2B48C',
          material: 'organic',
          price: 18.50,
          stock: 40,
          model3D: '/models/coffee-beans-light.glb',
          thumbnail: '/images/beans-light-thumb.jpg'
        },
        {
          id: '2-2',
          name: 'Medium Roast',
          color: 'Medium Brown',
          colorCode: '#8B4513',
          material: 'organic',
          price: 18.50,
          stock: 35,
          model3D: '/models/coffee-beans-medium.glb',
          thumbnail: '/images/beans-medium-thumb.jpg'
        },
        {
          id: '2-3',
          name: 'Dark Roast',
          color: 'Dark Brown',
          colorCode: '#654321',
          material: 'organic',
          price: 19.50,
          stock: 25,
          model3D: '/models/coffee-beans-dark.glb',
          thumbnail: '/images/beans-dark-thumb.jpg'
        }
      ],
      attributes: [
        { key: 'weight', value: 250, unit: 'g', displayName: 'Weight' },
        { key: 'origin', value: 'Colombia', displayName: 'Origin' },
        { key: 'altitude', value: 1800, unit: 'm', displayName: 'Altitude' },
        { key: 'organic', value: true, displayName: 'Organic Certified' }
      ],
      metadata: {
        tags: ['coffee', 'beans', 'arabica', 'single-origin'],
        featured: true,
        popular: false,
        newArrival: true,
        onSale: false,
        seoTitle: 'Premium Colombian Arabica Coffee Beans',
        seoDescription: 'Single origin Colombian Arabica beans for the perfect brew.'
      },
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    }
  ]

  // Actions
  const fetchProducts = async (): Promise<void> => {
    try {
      isLoading.value = true
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      products.value = mockProducts
      
      // Extract unique categories
      const uniqueCategories = [...new Set(mockProducts.map(p => p.category))]
      categories.value = uniqueCategories
      
    } catch (error) {
      console.error('Failed to fetch products:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const fetchCategories = async (): Promise<void> => {
    try {
      // Extract categories from products
      const uniqueCategories = [...new Set(products.value.map(p => p.category))]
      categories.value = uniqueCategories
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      throw error
    }
  }

  const selectProduct = (productId: string): void => {
    const product = products.value.find(p => p.id === productId)
    if (product) {
      selectedProduct.value = product
      // Auto-select first variant
      if (product.variants.length > 0) {
        selectedVariant.value = product.variants[0]
        activeColor.value = product.variants[0].colorCode
        activeMaterial.value = product.variants[0].material
      }
    }
  }

  const selectVariant = (variantId: string): void => {
    if (!selectedProduct.value) return
    
    const variant = selectedProduct.value.variants.find(v => v.id === variantId)
    if (variant) {
      selectedVariant.value = variant
      activeColor.value = variant.colorCode
      activeMaterial.value = variant.material
    }
  }

  const setActiveColor = (color: string): void => {
    activeColor.value = color
    
    // Find matching variant by color
    if (selectedProduct.value) {
      const variant = selectedProduct.value.variants.find(v => v.colorCode === color)
      if (variant) {
        selectedVariant.value = variant
        activeMaterial.value = variant.material
      }
    }
  }

  const setActiveMaterial = (material: string): void => {
    activeMaterial.value = material
    
    // Find matching variant by material
    if (selectedProduct.value) {
      const variant = selectedProduct.value.variants.find(v => v.material === material)
      if (variant) {
        selectedVariant.value = variant
        activeColor.value = variant.colorCode
      }
    }
  }

  const setViewMode = (mode: ProductState['viewMode']): void => {
    viewMode.value = mode
  }

  const updateFilters = (newFilters: Partial<typeof filters.value>): void => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const setSearchQuery = (query: string): void => {
    searchQuery.value = query
  }

  const clearSelection = (): void => {
    selectedProduct.value = null
    selectedVariant.value = null
    activeColor.value = '#8B4513'
    activeMaterial.value = 'ceramic'
  }

  const preloadProduct = async (productId: string): Promise<void> => {
    try {
      loadingStates.value.set(productId, true)
      
      // Simulate preloading
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log(`Preloaded product: ${productId}`)
      
    } catch (error) {
      console.error(`Failed to preload product ${productId}:`, error)
      throw error
    } finally {
      loadingStates.value.set(productId, false)
    }
  }

  // Getters
  const filteredProducts = computed((): Product[] => {
    let filtered = products.value

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Filter by category
    if (filters.value.category.length > 0) {
      filtered = filtered.filter(product =>
        filters.value.category.includes(product.category)
      )
    }

    // Filter by price range
    filtered = filtered.filter(product =>
      product.price >= filters.value.priceRange[0] &&
      product.price <= filters.value.priceRange[1]
    )

    // Filter by stock
    if (filters.value.inStock) {
      filtered = filtered.filter(product => product.stock > 0)
    }

    // Filter by featured
    if (filters.value.featured) {
      filtered = filtered.filter(product => product.metadata.featured)
    }

    // Filter by on sale
    if (filters.value.onSale) {
      filtered = filtered.filter(product => product.metadata.onSale)
    }

    return filtered
  })

  const availableColors = computed((): string[] => {
    if (!selectedProduct.value) return []
    return selectedProduct.value.variants.map(v => v.colorCode)
  })

  const availableMaterials = computed((): string[] => {
    if (!selectedProduct.value) return []
    return [...new Set(selectedProduct.value.variants.map(v => v.material))]
  })

  const currentProductVariants = computed((): ProductVariant[] => {
    return selectedProduct.value?.variants || []
  })

  const isProductSelected = computed((): boolean => {
    return selectedProduct.value !== null
  })

  const selectedProductModel = computed((): string | null => {
    return selectedVariant.value?.model3D || selectedProduct.value?.model3D || null
  })

  const productsByCategory = computed((): Record<string, Product[]> => {
    return filteredProducts.value.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = []
      }
      acc[product.category].push(product)
      return acc
    }, {} as Record<string, Product[]>)
  })

  return {
    // State
    products,
    categories,
    selectedProduct,
    selectedVariant,
    activeColor,
    activeMaterial,
    viewMode,
    filters,
    searchQuery,
    isLoading,
    loadingStates,
    
    // Actions
    fetchProducts,
    fetchCategories,
    selectProduct,
    selectVariant,
    setActiveColor,
    setActiveMaterial,
    setViewMode,
    updateFilters,
    setSearchQuery,
    clearSelection,
    preloadProduct,
    
    // Getters
    filteredProducts,
    availableColors,
    availableMaterials,
    currentProductVariants,
    isProductSelected,
    selectedProductModel,
    productsByCategory
  }
})
