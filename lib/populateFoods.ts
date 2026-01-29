import { db } from "@/lib/firebaseClient"
import { collection, writeBatch, doc, getDocs, query } from "firebase/firestore"

/**
 * TACO - Tabela Brasileira de Composição de Alimentos
 * Valores por 100g do alimento (conforme TACO UNICAMP v2.2)
 * Fonte: https://nepa.unicamp.br/
 */
const TACO_FOODS = [
  // ========== CARNES E DERIVADOS ==========
  { name: "Frango peito cozido", calories: 165, protein: 31.0, carbs: 0, fats: 3.6, category: "proteína" },
  { name: "Frango coxa cozida", calories: 209, protein: 26.2, carbs: 0, fats: 10.8, category: "proteína" },
  { name: "Carne acém cozida", calories: 217, protein: 26.1, carbs: 0, fats: 11.7, category: "proteína" },
  { name: "Carne alcatra cozida", calories: 271, protein: 25.9, carbs: 0, fats: 19.0, category: "proteína" },
  { name: "Carne filé mignon cozida", calories: 234, protein: 27.8, carbs: 0, fats: 12.8, category: "proteína" },
  { name: "Carne porco filé cozida", calories: 242, protein: 27.0, carbs: 0, fats: 14.0, category: "proteína" },
  
  // ========== OVOS E DERIVADOS ==========
  { name: "Ovo inteiro cozido", calories: 155, protein: 13.0, carbs: 1.1, fats: 11.0, category: "proteína" },
  { name: "Ovo clara cozida", calories: 52, protein: 11.0, carbs: 0.7, fats: 0.2, category: "proteína" },
  { name: "Ovo gema cozida", calories: 322, protein: 16.0, carbs: 0.3, fats: 28.5, category: "proteína" },
  
  // ========== PESCADOS E FRUTOS DO MAR ==========
  { name: "Salmão cozido", calories: 206, protein: 25.4, carbs: 0, fats: 11.0, category: "proteína" },
  { name: "Atum enlatado em água", calories: 96, protein: 21.5, carbs: 0, fats: 0.7, category: "proteína" },
  { name: "Tilápia cozida", calories: 128, protein: 26.2, carbs: 0, fats: 1.3, category: "proteína" },
  { name: "Camarão cozido", calories: 99, protein: 21.0, carbs: 0.9, fats: 0.3, category: "proteína" },
  { name: "Sardinha enlatada em óleo", calories: 208, protein: 25.4, carbs: 0, fats: 11.5, category: "proteína" },
  
  // ========== LEGUMINOSAS E DERIVADOS ==========
  { name: "Feijão cozido", calories: 77, protein: 5.2, carbs: 14.0, fats: 0.3, category: "proteína" },
  { name: "Lentilha cozida", calories: 116, protein: 8.9, carbs: 20.0, fats: 0.4, category: "proteína" },
  { name: "Grão de bico cozido", calories: 134, protein: 8.9, carbs: 22.5, fats: 2.1, category: "proteína" },
  { name: "Soja cozida", calories: 172, protein: 18.3, carbs: 10.0, fats: 8.7, category: "proteína" },
  { name: "Feijão preto cozido", calories: 77, protein: 5.2, carbs: 14.0, fats: 0.3, category: "proteína" },
  
  // ========== LEITE E DERIVADOS ==========
  { name: "Leite integral", calories: 61, protein: 3.2, carbs: 4.8, fats: 3.2, category: "proteína" },
  { name: "Leite desnatado", calories: 35, protein: 3.4, carbs: 4.7, fats: 0.1, category: "proteína" },
  { name: "Leite semidesnatado", calories: 49, protein: 3.3, carbs: 4.8, fats: 1.5, category: "proteína" },
  { name: "Iogurte natural integral", calories: 59, protein: 3.5, carbs: 4.7, fats: 3.2, category: "proteína" },
  { name: "Iogurte desnatado", calories: 40, protein: 3.8, carbs: 4.7, fats: 0.2, category: "proteína" },
  { name: "Queijo meia cura", calories: 389, protein: 25.4, carbs: 0.7, fats: 31.0, category: "proteína" },
  { name: "Queijo mozzarela", calories: 280, protein: 28.0, carbs: 3.1, fats: 17.0, category: "proteína" },
  { name: "Requeijão", calories: 236, protein: 10.2, carbs: 2.8, fats: 20.0, category: "proteína" },
  
  // ========== CEREAIS E DERIVADOS ==========
  { name: "Arroz branco cozido", calories: 130, protein: 2.7, carbs: 28.0, fats: 0.3, category: "carboidrato" },
  { name: "Arroz integral cozido", calories: 111, protein: 2.6, carbs: 23.0, fats: 0.9, category: "carboidrato" },
  { name: "Pão francês", calories: 290, protein: 8.9, carbs: 53.0, fats: 1.5, category: "carboidrato" },
  { name: "Pão integral", calories: 247, protein: 9.0, carbs: 47.0, fats: 2.0, category: "carboidrato" },
  { name: "Aveia em flocos crua", calories: 389, protein: 17.0, carbs: 66.0, fats: 6.9, category: "carboidrato" },
  { name: "Macarrão cozido", calories: 131, protein: 4.4, carbs: 25.0, fats: 1.1, category: "carboidrato" },
  { name: "Macarrão integral cozido", calories: 124, protein: 5.3, carbs: 25.0, fats: 0.4, category: "carboidrato" },
  { name: "Batata cozida com pele", calories: 77, protein: 1.7, carbs: 17.0, fats: 0.1, category: "carboidrato" },
  { name: "Batata doce cozida", calories: 86, protein: 1.6, carbs: 20.0, fats: 0.1, category: "carboidrato" },
  { name: "Milho cozido", calories: 83, protein: 2.7, carbs: 18.0, fats: 0.9, category: "carboidrato" },
  
  // ========== FRUTAS ==========
  { name: "Banana", calories: 89, protein: 1.1, carbs: 22.8, fats: 0.3, category: "fruta" },
  { name: "Maçã", calories: 52, protein: 0.3, carbs: 13.8, fats: 0.2, category: "fruta" },
  { name: "Laranja", calories: 47, protein: 0.9, carbs: 11.8, fats: 0.3, category: "fruta" },
  { name: "Tangerina", calories: 47, protein: 0.7, carbs: 12.0, fats: 0.3, category: "fruta" },
  { name: "Uva roxa", calories: 67, protein: 0.6, carbs: 17.0, fats: 0.2, category: "fruta" },
  { name: "Morango", calories: 32, protein: 0.7, carbs: 7.7, fats: 0.3, category: "fruta" },
  { name: "Abacaxi", calories: 50, protein: 0.5, carbs: 13.1, fats: 0.1, category: "fruta" },
  { name: "Melancia", calories: 30, protein: 0.6, carbs: 7.6, fats: 0.2, category: "fruta" },
  { name: "Melão", calories: 34, protein: 0.8, carbs: 8.0, fats: 0.2, category: "fruta" },
  { name: "Pêssego", calories: 39, protein: 0.9, carbs: 9.5, fats: 0.3, category: "fruta" },
  { name: "Abacate", calories: 160, protein: 2.0, carbs: 8.6, fats: 15.0, category: "fruta" },
  { name: "Pera", calories: 57, protein: 0.4, carbs: 15.0, fats: 0.1, category: "fruta" },
  { name: "Manga", calories: 60, protein: 0.7, carbs: 15.0, fats: 0.3, category: "fruta" },
  { name: "Mamão", calories: 43, protein: 0.5, carbs: 10.8, fats: 0.3, category: "fruta" },
  { name: "Goiaba", calories: 68, protein: 0.7, carbs: 16.0, fats: 0.3, category: "fruta" },
  { name: "Kiwi", calories: 61, protein: 0.8, carbs: 14.7, fats: 0.5, category: "fruta" },
  
  // ========== VERDURAS E HORTALIÇAS ==========
  { name: "Brócolis cozido", calories: 34, protein: 2.8, carbs: 6.6, fats: 0.4, category: "vegetal" },
  { name: "Couve crua", calories: 49, protein: 3.3, carbs: 8.8, fats: 0.6, category: "vegetal" },
  { name: "Espinafre cru", calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, category: "vegetal" },
  { name: "Alface crespa crua", calories: 15, protein: 1.2, carbs: 2.9, fats: 0.2, category: "vegetal" },
  { name: "Tomate cru", calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, category: "vegetal" },
  { name: "Cenoura crua", calories: 41, protein: 0.9, carbs: 9.6, fats: 0.2, category: "vegetal" },
  { name: "Cenoura cozida", calories: 35, protein: 0.7, carbs: 8.2, fats: 0.2, category: "vegetal" },
  { name: "Abóbora cozida", calories: 35, protein: 0.7, carbs: 8.1, fats: 0.1, category: "vegetal" },
  { name: "Couve-flor cozida", calories: 25, protein: 1.9, carbs: 5.0, fats: 0.3, category: "vegetal" },
  { name: "Abobrinha crua", calories: 21, protein: 1.5, carbs: 4.0, fats: 0.4, category: "vegetal" },
  { name: "Pepino cru", calories: 16, protein: 0.7, carbs: 4.0, fats: 0.1, category: "vegetal" },
  { name: "Pimentão cru", calories: 31, protein: 1.0, carbs: 7.3, fats: 0.3, category: "vegetal" },
  { name: "Cebola crua", calories: 40, protein: 1.1, carbs: 9.0, fats: 0.1, category: "vegetal" },
  { name: "Alho cru", calories: 149, protein: 6.3, carbs: 33.0, fats: 0.5, category: "vegetal" },
  { name: "Rúcula crua", calories: 25, protein: 2.6, carbs: 3.7, fats: 0.7, category: "vegetal" },
  
  // ========== NOZES E SEMENTES ==========
  { name: "Amendoim", calories: 567, protein: 25.8, carbs: 16.1, fats: 49.2, category: "gordura" },
  { name: "Castanha de caju", calories: 553, protein: 18.2, carbs: 30.1, fats: 43.9, category: "gordura" },
  { name: "Castanha do pará", calories: 656, protein: 14.3, carbs: 12.3, fats: 66.4, category: "gordura" },
  { name: "Amêndoa", calories: 579, protein: 21.0, carbs: 21.6, fats: 49.9, category: "gordura" },
  { name: "Sementes de girassol", calories: 584, protein: 20.8, carbs: 20.0, fats: 51.5, category: "gordura" },
  { name: "Sementes de abóbora", calories: 559, protein: 24.7, carbs: 15.0, fats: 49.0, category: "gordura" },
  { name: "Sementes de linhaça", calories: 534, protein: 18.3, carbs: 28.9, fats: 42.2, category: "gordura" },
  { name: "Nozes", calories: 660, protein: 15.2, carbs: 13.7, fats: 65.2, category: "gordura" },
  
  // ========== GORDURAS E ÓLEOS ==========
  { name: "Óleo de oliva", calories: 884, protein: 0, carbs: 0, fats: 100, category: "gordura" },
  { name: "Azeite de oliva", calories: 884, protein: 0, carbs: 0, fats: 100, category: "gordura" },
  { name: "Manteiga", calories: 717, protein: 0.7, carbs: 0.1, fats: 81.0, category: "gordura" },
  { name: "Margarina", calories: 718, protein: 0, carbs: 0.1, fats: 80.0, category: "gordura" },
  
  // ========== BEBIDAS ==========
  { name: "Café coado", calories: 0, protein: 0.1, carbs: 0, fats: 0, category: "bebida" },
  { name: "Chá preto coado", calories: 1, protein: 0, carbs: 0, fats: 0, category: "bebida" },
  { name: "Suco natural laranja", calories: 47, protein: 0.9, carbs: 11.8, fats: 0.3, category: "bebida" },
  
  // ========== CONDIMENTOS E DIVERSOS ==========
  { name: "Mel", calories: 304, protein: 0.3, carbs: 82.0, fats: 0, category: "outro" },
  { name: "Açúcar refinado", calories: 387, protein: 0, carbs: 100, fats: 0, category: "outro" },
  { name: "Chocolate 70% cacau", calories: 598, protein: 7.8, carbs: 46.0, fats: 43.0, category: "outro" },
]

export async function populateFoodsDatabase() {
  if (!db) {
    console.error("Firestore not initialized")
    return
  }

  try {
    const foodsCollection = collection(db, "foods")
    
    // Verificar se já foi populado
    const snapshot = await getDocs(query(foodsCollection))
    if (snapshot.size > 0) {
      console.log("[v0] Foods database já foi populado. Alimentos existentes:", snapshot.size)
      return { success: true, message: "Foods já existem", count: snapshot.size }
    }

    const batch = writeBatch(db)

    TACO_FOODS.forEach((food) => {
      const docRef = doc(foodsCollection)
      batch.set(docRef, {
        name: food.name.toLowerCase(),
        displayName: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        category: food.category,
        createdAt: new Date(),
      })
    })

    await batch.commit()
    console.log(`[v0] Successfully populated ${TACO_FOODS.length} foods from TACO`)
    return { success: true, count: TACO_FOODS.length, message: "Foods populated from TACO" }
  } catch (error) {
    console.error("[v0] Error populating foods database:", error)
    throw error
  }
}
