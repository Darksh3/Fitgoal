import { NextRequest, NextResponse } from 'next/server'
import { searchFoods, getFoodsByCategory } from '@/lib/supabaseFoods'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const category = searchParams.get('category')

  console.log('[v0] Foods API called with:', { query, category })

  try {
    let results

    if (query) {
      console.log('[v0] Searching for foods with query:', query)
      results = await searchFoods(query)
      console.log('[v0] Search results:', results)
    } else if (category) {
      console.log('[v0] Fetching foods by category:', category)
      results = await getFoodsByCategory(category)
      console.log('[v0] Category results:', results)
    } else {
      return NextResponse.json(
        { error: 'Provide either q or category parameter' },
        { status: 400 }
      )
    }

    console.log('[v0] Returning results count:', results?.length)
    return NextResponse.json({ foods: results })
  } catch (error) {
    console.error('[v0] Error in foods API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch foods', details: String(error) },
      { status: 500 }
    )
  }
}
