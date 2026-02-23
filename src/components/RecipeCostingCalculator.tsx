import { useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  supplierId?: string;
  supplierName?: string;
  category: string;
}

interface Recipe {
  recipeId?: Id<'recipes'>;
  name: string;
  description: string;
  servings: number;
  ingredients: RecipeIngredient[];
  totalCost: number;
  costPerServing: number;
  suggestedSellingPrice: number;
  profitMargin: number;
  category: string;
  preparationTime: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
}

interface SavedRecipe extends Recipe {
  _id: Id<'recipes'>;
  createdAt: number;
  updatedAt: number;
}

interface CostAnalysis {
  totalIngredientCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  suggestedMarkup: number;
  breakEvenPrice: number;
  targetProfitPrice: number;
}

interface Props {
  vendorId: Id<'vendors'>;
}

interface SupplierRecord {
  _id: Id<'suppliers'>;
  businessName: string;
}

interface InventoryRecord {
  _id: Id<'inventory'>;
  supplierId: Id<'suppliers'>;
  itemName: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  currentStock: number;
}

export default function RecipeCostingCalculator({ vendorId }: Props) {
  const [activeTab, setActiveTab] = useState<'calculator' | 'recipes' | 'analysis' | 'trends'>('calculator');
  const [currentRecipe, setCurrentRecipe] = useState<Recipe>({
    recipeId: undefined,
    name: '',
    description: '',
    servings: 1,
    ingredients: [],
    totalCost: 0,
    costPerServing: 0,
    suggestedSellingPrice: 0,
    profitMargin: 40,
    category: 'Main Course',
    preparationTime: 30,
    difficulty: 'Medium',
    tags: []
  });

  const savedRecipes = useQuery(api.recipes.getRecipesByVendor, { vendorId }) as SavedRecipe[] | undefined;
  const createRecipe = useMutation(api.recipes.createRecipe);
  const updateRecipe = useMutation(api.recipes.updateRecipe);

  const [newIngredient, setNewIngredient] = useState<Partial<RecipeIngredient>>({
    name: '',
    quantity: 0,
    unit: 'g',
    pricePerUnit: 0,
    category: 'Vegetables'
  });
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [uiMessage, setUiMessage] = useState('');

  const suppliers = useQuery(api.suppliers.listAllSuppliers, {}) as SupplierRecord[] | undefined;
  const allInventory = useQuery(api.inventory.getAvailableInventory, {}) as InventoryRecord[] | undefined;
  const isLoading = suppliers === undefined || allInventory === undefined || savedRecipes === undefined;

  const recipesList: Recipe[] = useMemo(
    () =>
      (savedRecipes ?? []).map((recipe) => ({
        ...recipe,
        recipeId: recipe._id,
      })),
    [savedRecipes]
  );

  const normalizeQuantityForPricing = (quantity: number, unit: string) => {
    if (unit === 'g' || unit === 'ml') return quantity / 1000;
    if (unit === 'kg' || unit === 'l' || unit === 'pieces' || unit === 'cups') return quantity;
    return quantity;
  };

  const calculateIngredientLineCost = (ingredient: Pick<RecipeIngredient, 'quantity' | 'unit' | 'pricePerUnit'>) => {
    return normalizeQuantityForPricing(ingredient.quantity, ingredient.unit) * ingredient.pricePerUnit;
  };

  const calculateRecipeCost = () => {
    const ingredientCost = currentRecipe.ingredients.reduce((total, ingredient) => {
      return total + calculateIngredientLineCost(ingredient);
    }, 0);

    const laborCost = (currentRecipe.preparationTime / 60) * 50; // ₹50 per hour labor
    const overheadCost = ingredientCost * 0.15; // 15% overhead
    const totalCost = ingredientCost + laborCost + overheadCost;
    const costPerServing = totalCost / currentRecipe.servings;
    
    const markupMultiplier = (100 + currentRecipe.profitMargin) / 100;
    const suggestedSellingPrice = costPerServing * markupMultiplier;

    return {
      ingredientCost,
      laborCost,
      overheadCost,
      totalCost,
      costPerServing,
      suggestedSellingPrice
    };
  };

  const addIngredient = () => {
    if (newIngredient.name && newIngredient.quantity && newIngredient.pricePerUnit) {
      const supplierName = suppliers?.find(sup => String(sup._id) === newIngredient.supplierId)?.businessName;
      const ingredient: RecipeIngredient = {
        id: Date.now().toString(),
        name: newIngredient.name,
        quantity: newIngredient.quantity || 0,
        unit: newIngredient.unit || 'g',
        pricePerUnit: newIngredient.pricePerUnit || 0,
        category: newIngredient.category || 'Vegetables',
        supplierId: newIngredient.supplierId,
        supplierName
      };

      setCurrentRecipe(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, ingredient]
      }));

      setNewIngredient({
        name: '',
        quantity: 0,
        unit: 'g',
        pricePerUnit: 0,
        category: 'Vegetables'
      });
      setSelectedInventoryId('');
    }
  };

  const selectInventorySuggestion = (inventoryId: string) => {
    setSelectedInventoryId(inventoryId);
    const inventoryItem = allInventory?.find(item => String(item._id) === inventoryId);
    if (!inventoryItem) return;

    setNewIngredient(prev => ({
      ...prev,
      name: inventoryItem.itemName,
      category: inventoryItem.category,
      unit: inventoryItem.unit,
      pricePerUnit: inventoryItem.pricePerUnit,
      supplierId: String(inventoryItem.supplierId)
    }));
    setUiMessage(`Loaded live pricing for ${inventoryItem.itemName}.`);
  };

  const removeIngredient = (ingredientId: string) => {
    setCurrentRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== ingredientId)
    }));
  };

  const saveRecipe = async () => {
    const costs = calculateRecipeCost();
    const recipeToSave: Recipe = {
      ...currentRecipe,
      totalCost: costs.totalCost,
      costPerServing: costs.costPerServing,
      suggestedSellingPrice: costs.suggestedSellingPrice
    };

    try {
      if (currentRecipe.recipeId) {
        await updateRecipe({
          recipeId: currentRecipe.recipeId,
          name: recipeToSave.name,
          description: recipeToSave.description,
          servings: recipeToSave.servings,
          ingredients: recipeToSave.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            pricePerUnit: ingredient.pricePerUnit,
            category: ingredient.category,
            supplierId: ingredient.supplierId as Id<'suppliers'> | undefined,
            supplierName: ingredient.supplierName,
          })),
          totalCost: recipeToSave.totalCost,
          costPerServing: recipeToSave.costPerServing,
          suggestedSellingPrice: recipeToSave.suggestedSellingPrice,
          profitMargin: recipeToSave.profitMargin,
          category: recipeToSave.category,
          preparationTime: recipeToSave.preparationTime,
          difficulty: recipeToSave.difficulty,
          tags: recipeToSave.tags,
        });
        setUiMessage(`Updated recipe: ${recipeToSave.name || 'Untitled Recipe'}.`);
      } else {
        await createRecipe({
          vendorId,
          name: recipeToSave.name,
          description: recipeToSave.description,
          servings: recipeToSave.servings,
          ingredients: recipeToSave.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            pricePerUnit: ingredient.pricePerUnit,
            category: ingredient.category,
            supplierId: ingredient.supplierId as Id<'suppliers'> | undefined,
            supplierName: ingredient.supplierName,
          })),
          totalCost: recipeToSave.totalCost,
          costPerServing: recipeToSave.costPerServing,
          suggestedSellingPrice: recipeToSave.suggestedSellingPrice,
          profitMargin: recipeToSave.profitMargin,
          category: recipeToSave.category,
          preparationTime: recipeToSave.preparationTime,
          difficulty: recipeToSave.difficulty,
          tags: recipeToSave.tags,
        });
        setUiMessage(`Saved recipe: ${recipeToSave.name || 'Untitled Recipe'}.`);
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setUiMessage('Failed to save recipe. Please try again.');
      return;
    }
    
    // Reset form
    setCurrentRecipe({
      recipeId: undefined,
      name: '',
      description: '',
      servings: 1,
      ingredients: [],
      totalCost: 0,
      costPerServing: 0,
      suggestedSellingPrice: 0,
      profitMargin: 40,
      category: 'Main Course',
      preparationTime: 30,
      difficulty: 'Medium',
      tags: []
    });
  };

  const loadRecipe = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setActiveTab('calculator');
  };

  const duplicateRecipe = async (recipe: Recipe) => {
    const duplicatedRecipe: Recipe = {
      ...recipe,
      recipeId: undefined,
      name: `${recipe.name} (Copy)`,
    };
    try {
      await createRecipe({
        vendorId,
        name: duplicatedRecipe.name,
        description: duplicatedRecipe.description,
        servings: duplicatedRecipe.servings,
        ingredients: duplicatedRecipe.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          pricePerUnit: ingredient.pricePerUnit,
          category: ingredient.category,
          supplierId: ingredient.supplierId as Id<'suppliers'> | undefined,
          supplierName: ingredient.supplierName,
        })),
        totalCost: duplicatedRecipe.totalCost,
        costPerServing: duplicatedRecipe.costPerServing,
        suggestedSellingPrice: duplicatedRecipe.suggestedSellingPrice,
        profitMargin: duplicatedRecipe.profitMargin,
        category: duplicatedRecipe.category,
        preparationTime: duplicatedRecipe.preparationTime,
        difficulty: duplicatedRecipe.difficulty,
        tags: duplicatedRecipe.tags,
      });
      setUiMessage(`Duplicated ${recipe.name}.`);
    } catch (error) {
      console.error('Failed to duplicate recipe:', error);
      setUiMessage('Failed to duplicate recipe.');
    }
  };

  const costs = calculateRecipeCost();

  // Calculate popular ingredients and cost trends
  const ingredientUsage = recipesList.flatMap(r => r.ingredients).reduce((acc, ing) => {
    acc[ing.name] = (acc[ing.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const popularIngredients = Object.entries(ingredientUsage)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const trackedItems = useMemo(
    () => popularIngredients.map(([name]) => name).slice(0, 5),
    [popularIngredients]
  );
  const priceTrends = useQuery(
    api.inventory.getBulkPriceTrends,
    trackedItems.length > 0 ? { itemNames: trackedItems, days: 30 } : "skip"
  ) as Array<{
    itemName: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    trend: string;
    dataPoints: number;
  }> | undefined;
  const priceAlerts = useQuery(api.priceAlerts.getVendorPriceAlerts, { vendorId });

  const triggeredAlerts = useMemo(
    () => (priceAlerts ?? []).filter((alert) => alert.currentPrice > 0 && alert.currentPrice <= alert.targetPrice),
    [priceAlerts]
  );

  const risingTrends = useMemo(
    () => (priceTrends ?? []).filter((trend) => trend.changePercent > 5),
    [priceTrends]
  );
  const fallingTrends = useMemo(
    () => (priceTrends ?? []).filter((trend) => trend.changePercent < -5),
    [priceTrends]
  );

  const optimizationCandidates = useMemo(() => {
    return recipesList
      .filter((recipe) => recipe.costPerServing > 0)
      .sort((a, b) => b.costPerServing - a.costPerServing)
      .slice(0, 2);
  }, [recipesList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🧮 Recipe Costing Calculator</h2>
            <p className="opacity-90">Calculate accurate costs and set profitable prices for your dishes</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{recipesList.length}</div>
            <div className="text-sm opacity-90">Saved Recipes</div>
          </div>
        </div>
      </div>

      {uiMessage && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800">
          {uiMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'calculator', label: 'Cost Calculator', icon: '🧮' },
              { id: 'recipes', label: 'Saved Recipes', icon: '📝' },
              { id: 'analysis', label: 'Cost Analysis', icon: '📊' },
              { id: 'trends', label: 'Market Trends', icon: '📈' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="p-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Recipe Details Form */}
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recipe Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recipe Name</label>
                      <input
                        type="text"
                        value={currentRecipe.name}
                        onChange={(e) => setCurrentRecipe(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter recipe name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={currentRecipe.description}
                        onChange={(e) => setCurrentRecipe(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        rows={3}
                        placeholder="Brief description of the dish"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Servings</label>
                        <input
                          type="number"
                          min="1"
                          value={currentRecipe.servings}
                          onChange={(e) => setCurrentRecipe(prev => ({ ...prev, servings: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prep Time (min)</label>
                        <input
                          type="number"
                          min="1"
                          value={currentRecipe.preparationTime}
                          onChange={(e) => setCurrentRecipe(prev => ({ ...prev, preparationTime: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                          value={currentRecipe.category}
                          onChange={(e) => setCurrentRecipe(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="Breakfast">Breakfast</option>
                          <option value="Main Course">Main Course</option>
                          <option value="Snacks">Snacks</option>
                          <option value="Desserts">Desserts</option>
                          <option value="Beverages">Beverages</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Profit (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentRecipe.profitMargin}
                          onChange={(e) => setCurrentRecipe(prev => ({ ...prev, profitMargin: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Ingredients */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Ingredients</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Use Marketplace Item (Optional)</label>
                      <select
                        value={selectedInventoryId}
                        onChange={(e) => selectInventorySuggestion(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">Choose from live inventory</option>
                        {(allInventory || []).slice(0, 100).map(item => (
                          <option key={item._id} value={item._id}>
                            {item.itemName} • ₹{item.pricePerUnit}/{item.unit} • Stock: {item.currentStock}
                          </option>
                        ))}
                      </select>
                      {isLoading && (
                        <p className="text-xs text-gray-500 mt-1">Loading live inventory suggestions...</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ingredient Name</label>
                        <input
                          type="text"
                          value={newIngredient.name}
                          onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="e.g., Tomatoes"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                          value={newIngredient.category}
                          onChange={(e) => setNewIngredient(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="Vegetables">Vegetables</option>
                          <option value="Fruits">Fruits</option>
                          <option value="Meat">Meat</option>
                          <option value="Dairy">Dairy</option>
                          <option value="Grains">Grains</option>
                          <option value="Spices">Spices</option>
                          <option value="Oil">Oil</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={newIngredient.quantity}
                          onChange={(e) => setNewIngredient(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                        <select
                          value={newIngredient.unit}
                          onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="g">Grams</option>
                          <option value="kg">Kilograms</option>
                          <option value="ml">Milliliters</option>
                          <option value="l">Liters</option>
                          <option value="pieces">Pieces</option>
                          <option value="cups">Cups</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price per Unit</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newIngredient.pricePerUnit}
                          onChange={(e) => setNewIngredient(prev => ({ ...prev, pricePerUnit: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="₹"
                        />
                      </div>
                    </div>

                    <button
                      onClick={addIngredient}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md font-medium transition-colors"
                    >
                      Add Ingredient
                    </button>
                  </div>
                </div>
              </div>

              {/* Recipe Ingredients & Cost Breakdown */}
              <div className="space-y-6">
                {/* Ingredients List */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recipe Ingredients</h3>
                  
                  {currentRecipe.ingredients.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🥘</div>
                      <p className="text-gray-500">Add ingredients to start calculating costs</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentRecipe.ingredients.map(ingredient => (
                        <div key={ingredient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{ingredient.name}</div>
                            <div className="text-sm text-gray-600">
                              {ingredient.quantity} {ingredient.unit} × ₹{ingredient.pricePerUnit}/{ingredient.unit}
                            </div>
                            {ingredient.supplierName && (
                              <div className="text-xs text-gray-500">
                                Supplier: {ingredient.supplierName}
                              </div>
                            )}
                          </div>
                          <div className="text-right mr-4">
                            <div className="font-semibold text-green-600">
                              ₹{calculateIngredientLineCost(ingredient).toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={() => removeIngredient(ingredient.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cost Breakdown */}
                {currentRecipe.ingredients.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Breakdown</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ingredients Cost:</span>
                        <span className="font-medium">₹{costs.ingredientCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Labor Cost:</span>
                        <span className="font-medium">₹{costs.laborCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Overhead (15%):</span>
                        <span className="font-medium">₹{costs.overheadCost.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total Cost:</span>
                          <span className="text-red-600">₹{costs.totalCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cost per Serving:</span>
                          <span className="font-medium">₹{costs.costPerServing.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Suggested Selling Price:</span>
                          <span className="text-green-600">₹{costs.suggestedSellingPrice.toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {currentRecipe.profitMargin}% profit margin
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={saveRecipe}
                      disabled={!currentRecipe.name || currentRecipe.ingredients.length === 0}
                      className="w-full mt-6 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-md font-medium transition-colors"
                    >
                      Save Recipe
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Saved Recipes Tab */}
        {activeTab === 'recipes' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Saved Recipes</h3>
              <button
                onClick={() => setActiveTab('calculator')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                + Create New Recipe
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipesList.map(recipe => (
                <div key={recipe.recipeId || recipe.name} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{recipe.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{recipe.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{recipe.servings} servings</span>
                      <span>{recipe.preparationTime} min</span>
                      <span className="capitalize">{recipe.difficulty}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-medium">₹{recipe.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cost/Serving:</span>
                      <span className="font-medium">₹{recipe.costPerServing.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="font-semibold text-green-600">₹{recipe.suggestedSellingPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadRecipe(recipe)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => duplicateRecipe(recipe)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
                    >
                      Duplicate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Cost Analysis</h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Popular Ingredients */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Most Used Ingredients</h4>
                <div className="space-y-3">
                  {popularIngredients.map(([ingredient, count], index) => (
                    <div key={ingredient} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-xs flex items-center justify-center mr-3">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">{ingredient}</span>
                      </div>
                      <span className="text-sm text-gray-500">{count} recipes</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recipe Categories */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Recipe Categories</h4>
                <div className="space-y-3">
                  {Object.entries(
                    recipesList.reduce((acc, recipe) => {
                      acc[recipe.category] = (acc[recipe.category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category}</span>
                      <div className="flex items-center">
                        <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-orange-500 h-2 rounded-full" 
                            style={{ width: `${(count / Math.max(recipesList.length, 1)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cost Analysis Charts */}
            <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Profitability Analysis</h4>
              <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-gray-600">Profitability charts would appear here</p>
                  <p className="text-sm text-gray-500 mt-2">Showing cost vs profit margins across all recipes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Market Trends & Price Alerts</h3>
            
            <div className="grid gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Triggered Price Alerts</h4>
                {triggeredAlerts.length === 0 ? (
                  <div className="text-sm text-gray-600">No active alerts have been triggered.</div>
                ) : (
                  <div className="space-y-3">
                    {triggeredAlerts.map((alert) => (
                      <div key={alert._id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{alert.itemName}</span>
                          <span className="text-green-700 font-semibold">
                            ₹{alert.currentPrice.toFixed(2)} (target ₹{alert.targetPrice.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
                <h4 className="font-semibold text-red-800 mb-4">Price Increase Alerts</h4>
                {risingTrends.length === 0 ? (
                  <div className="text-sm text-red-700">No significant price increases detected.</div>
                ) : (
                  <div className="space-y-3">
                    {risingTrends.map((trend) => (
                      <div key={`rise-${trend.itemName}`} className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{trend.itemName}</span>
                          <span className="text-red-600 font-semibold">
                            +{trend.changePercent.toFixed(1)}% in last 30 days
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Current avg price: ₹{trend.currentPrice.toFixed(2)}. Consider adjusting recipes or sourcing alternatives.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                <h4 className="font-semibold text-green-800 mb-4">Cost Savings Opportunities</h4>
                {fallingTrends.length === 0 ? (
                  <div className="text-sm text-green-700">No major price drops yet.</div>
                ) : (
                  <div className="space-y-3">
                    {fallingTrends.map((trend) => (
                      <div key={`fall-${trend.itemName}`} className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{trend.itemName}</span>
                          <span className="text-green-600 font-semibold">
                            {trend.changePercent.toFixed(1)}% in last 30 days
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Current avg price: ₹{trend.currentPrice.toFixed(2)}. Consider stocking up or promoting dishes using this ingredient.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Recipe Optimization Suggestions</h4>
                {optimizationCandidates.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    Save recipes to start getting cost optimization insights.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {optimizationCandidates.map((recipe) => (
                      <div key={`opt-${recipe.recipeId || recipe.name}`} className="p-4 bg-blue-50 rounded-lg">
                        <h5 className="font-medium text-blue-800 mb-2">{recipe.name}</h5>
                        <p className="text-sm text-blue-700 mb-2">
                          Current cost per serving: ₹{recipe.costPerServing.toFixed(2)}. Profit margin: {recipe.profitMargin}%.
                        </p>
                        <ul className="text-sm text-blue-600 space-y-1">
                          <li>Review ingredient pricing from your top suppliers.</li>
                          <li>Compare with recent price alerts for key items.</li>
                          <li>Adjust selling price if cost changes persist.</li>
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
