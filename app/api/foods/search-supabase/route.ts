import { NextRequest, NextResponse } from 'next/server'
import { searchFoods, getFoodsByCategory } from '@/lib/supabaseFoods'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const category = searchParams.get('category')

  try {
    let results

    if (query) {
      results = await searchFoods(query)
    } else if (category) {
      results = await getFoodsByCategory(category)
    } else {
      return NextResponse.json(
        { error: 'Provide either q or category parameter' },
        { status: 400 }
      )
    }

    return NextResponse.json({ foods: results })
  } catch (error) {
    console.error('[v0] Error in foods API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch foods' },
      { status: 500 }
    )
  }
}
