import { supabase } from './supabase'

export interface Food {
  id?: number
  name: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  serving_size?: string
  unit?: string
  category?: string
}

/**
 * Search foods by name
 */
export async function searchFoods(query: string): Promise<Food[]> {
  try {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10)

    if (error) {
      console.error('[v0] Error searching foods:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('[v0] Exception searching foods:', err)
    return []
  }
}

/**
 * Get all foods by category
 */
export async function getFoodsByCategory(category: string): Promise<Food[]> {
  try {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .eq('category', category)
      .order('name')

    if (error) {
      console.error('[v0] Error fetching foods by category:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('[v0] Exception fetching foods:', err)
    return []
  }
}

/**
 * Get all unique food categories
 */
export async function getFoodCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('foods')
      .select('category')
      .not('category', 'is', null)

    if (error) {
      console.error('[v0] Error fetching categories:', error)
      return []
    }

    // Remove duplicates
    const categories = [...new Set(data?.map(item => item.category) || [])]
    return categories.sort()
  } catch (err) {
    console.error('[v0] Exception fetching categories:', err)
    return []
  }
}

/**
 * Add a custom food
 */
export async function addFood(food: Food): Promise<Food | null> {
  try {
    const { data, error } = await supabase
      .from('foods')
      .insert([food])
      .select()
      .single()

    if (error) {
      console.error('[v0] Error adding food:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('[v0] Exception adding food:', err)
    return null
  }
}

/**
 * Get a single food by ID
 */
export async function getFoodById(id: number): Promise<Food | null> {
  try {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[v0] Error fetching food:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('[v0] Exception fetching food:', err)
    return null
  }
}

/**
 * Delete a food (only custom foods)
 */
export async function deleteFood(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('foods')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[v0] Error deleting food:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[v0] Exception deleting food:', err)
    return false
  }
}
