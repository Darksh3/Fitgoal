import { db } from "@/lib/firebaseClient"
import { collection, writeBatch, doc } from "firebase/firestore"

// Popular foods database with macronutrients
const POPULAR_FOODS = [
  // Proteins
  { name: "Frango peito", calories: 165, protein: 31, carbs: 0, fats: 3.6, category: "proteína" },
  { name: "Ovo", calories: 155, protein: 13, carbs: 1.1, fats: 11, category: "proteína" },
  { name: "Iogurte grego", calories: 59, protein: 10, carbs: 3.3, fats: 0.4, category: "proteína" },
  { name: "Salmão", calories: 208, protein: 22, carbs: 0, fats: 13, category: "proteína" },
  { name: "Carne vermelha", calories: 250, protein: 26, carbs: 0, fats: 15, category: "proteína" },
  { name: "Tofu", calories: 76, protein: 8, carbs: 1.9, fats: 4.8, category: "proteína" },
  { name: "Leite integral", calories: 61, protein: 3.2, carbs: 4.8, fats: 3.3, category: "proteína" },
  { name: "Queijo mozzarela", calories: 280, protein: 28, carbs: 3.1, fats: 17, category: "proteína" },

  // Carboidratos
  { name: "Arroz integral", calories: 111, protein: 2.6, carbs: 23, fats: 0.9, category: "carboidrato" },
  { name: "Batata doce", calories: 86, protein: 1.6, carbs: 20, fats: 0.1, category: "carboidrato" },
  { name: "Maçã", calories: 52, protein: 0.3, carbs: 14, fats: 0.2, category: "carboidrato" },
  { name: "Banana", calories: 89, protein: 1.1, carbs: 23, fats: 0.3, category: "carboidrato" },
  { name: "Aveia", calories: 389, protein: 17, carbs: 66, fats: 6.9, category: "carboidrato" },
  { name: "Pão integral", calories: 265, protein: 8.7, carbs: 49, fats: 3.3, category: "carboidrato" },
  { name: "Pasta integral", calories: 124, protein: 5.3, carbs: 25, fats: 0.4, category: "carboidrato" },
  { name: "Batata cozida", calories: 77, protein: 2, carbs: 17, fats: 0.1, category: "carboidrato" },

  // Gorduras saudáveis
  { name: "Abacate", calories: 160, protein: 2, carbs: 9, fats: 15, category: "gordura" },
  { name: "Azeite de oliva", calories: 884, protein: 0, carbs: 0, fats: 100, category: "gordura" },
  { name: "Amêndoas", calories: 579, protein: 21, carbs: 22, fats: 50, category: "gordura" },
  { name: "Castanha de caju", calories: 553, protein: 18, carbs: 30, fats: 44, category: "gordura" },
  { name: "Coco ralado", calories: 354, protein: 3.3, carbs: 15, fats: 33, category: "gordura" },

  // Vegetais
  { name: "Brócolis", calories: 34, protein: 2.8, carbs: 7, fats: 0.4, category: "vegetal" },
  { name: "Cenoura", calories: 41, protein: 0.9, carbs: 10, fats: 0.2, category: "vegetal" },
  { name: "Espinafre", calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, category: "vegetal" },
  { name: "Alface", calories: 15, protein: 1.2, carbs: 3, fats: 0.2, category: "vegetal" },
  { name: "Tomate", calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, category: "vegetal" },
  { name: "Pepino", calories: 16, protein: 0.7, carbs: 4, fats: 0.1, category: "vegetal" },
  { name: "Couve-flor", calories: 25, protein: 1.9, carbs: 5, fats: 0.3, category: "vegetal" },
  { name: "Abobrinha", calories: 21, protein: 1.5, carbs: 4, fats: 0.4, category: "vegetal" },

  // Frutas
  { name: "Laranja", calories: 47, protein: 0.7, carbs: 12, fats: 0.2, category: "fruta" },
  { name: "Morango", calories: 32, protein: 0.7, carbs: 8, fats: 0.3, category: "fruta" },
  { name: "Melancia", calories: 30, protein: 0.6, carbs: 8, fats: 0.2, category: "fruta" },
  { name: "Melão", calories: 34, protein: 0.8, carbs: 8, fats: 0.2, category: "fruta" },
  { name: "Pera", calories: 57, protein: 0.4, carbs: 15, fats: 0.1, category: "fruta" },
  { name: "Uva", calories: 67, protein: 0.7, carbs: 17, fats: 0.2, category: "fruta" },
  { name: "Blueberry", calories: 57, protein: 0.7, carbs: 14, fats: 0.3, category: "fruta" },
  { name: "Pêssego", calories: 39, protein: 0.9, carbs: 10, fats: 0.3, category: "fruta" },
]

export async function populateFoodsDatabase() {
  if (!db) {
    console.error("Firestore not initialized")
    return
  }

  try {
    const batch = writeBatch(db)
    const foodsCollection = collection(db, "foods")

    POPULAR_FOODS.forEach((food) => {
      const docRef = doc(foodsCollection)
      batch.set(docRef, {
        name: food.name,
        nameLowercase: food.name.toLowerCase(),
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        category: food.category,
        createdAt: new Date(),
      })
    })

    await batch.commit()
    console.log(`Successfully populated ${POPULAR_FOODS.length} foods`)
    return { success: true, count: POPULAR_FOODS.length }
  } catch (error) {
    console.error("Error populating foods database:", error)
    throw error
  }
}
