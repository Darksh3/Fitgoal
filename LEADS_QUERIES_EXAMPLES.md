## Queries e Exemplos de Uso dos Leads Salvos

### Como Utilizar os Dados dos Leads Salvos

---

## 1. Buscar um Lead Específico

\`\`\`javascript
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"

// Buscar lead por UID
const fetchLead = async (uid) => {
  const leadRef = doc(db, "leads", uid)
  const leadSnap = await getDoc(leadRef)
  
  if (leadSnap.exists()) {
    console.log("Lead data:", leadSnap.data())
    return leadSnap.data()
  } else {
    console.log("Lead não encontrado")
    return null
  }
}
\`\`\`

---

## 2. Listar Todos os Leads

\`\`\`javascript
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"

const fetchAllLeads = async () => {
  const leadsRef = collection(db, "leads")
  const querySnapshot = await getDocs(leadsRef)
  
  const leads = []
  querySnapshot.forEach((doc) => {
    leads.push({
      id: doc.id,
      ...doc.data()
    })
  })
  
  console.log("Total de leads:", leads.length)
  return leads
}
\`\`\`

---

## 3. Filtrar Leads por Objetivo

\`\`\`javascript
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"

// Buscar leads que querem perder peso
const fetchLeadsLosingWeight = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("goals", "array-contains", "perder-peso"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push({
      id: doc.id,
      ...doc.data()
    })
  })
  
  return leads
}
\`\`\`

---

## 4. Filtrar Leads por Experiência

\`\`\`javascript
// Buscar leads iniciantes
const fetchBeginnerLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("experience", "==", "iniciante"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}

// Buscar leads avançados
const fetchAdvancedLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("experience", "==", "avançado"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}
\`\`\`

---

## 5. Filtrar Leads por Gênero

\`\`\`javascript
// Buscar leads mulheres
const fetchFemaleLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("gender", "==", "mulher"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}

// Buscar leads homens
const fetchMaleLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("gender", "==", "homem"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}
\`\`\`

---

## 6. Filtrar Leads por IMC (Sobrepeso)

\`\`\`javascript
// Buscar leads com sobrepeso
const fetchOverweightLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("imcStatus", "==", "overweight"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}

// Buscar leads com obesidade
const fetchObeseLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("imcStatus", "==", "obese"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}
\`\`\`

---

## 7. Filtrar Leads por Biótipo

\`\`\`javascript
// Buscar leads ectomorfos
const fetchEctomorphLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("bodyType", "==", "ectomorfo"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}

// Buscar leads mesomorfos
const fetchMesomorphLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("bodyType", "==", "mesomorfo"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}

// Buscar leads endomorfos
const fetchEndomorphLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("bodyType", "==", "endomorfo"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}
\`\`\`

---

## 8. Filtrar Leads que Querem Suplemento

\`\`\`javascript
import { collection, query, where, getDocs } from "firebase/firestore"

// Buscar leads interessados em suplementos
const fetchSupplementInterestedLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("wantsSupplement", "==", "sim"))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push({
      id: doc.id,
      name: doc.data().name,
      email: doc.data().email,
      supplementType: doc.data().supplementType
    })
  })
  
  return leads
}
\`\`\`

---

## 9. Filtrar Leads por Dias de Treino

\`\`\`javascript
// Buscar leads que treinam 5+ dias por semana
const fetchHeavyTrainerLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("trainingDaysPerWeek", ">=", 5))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}

// Buscar leads com treino leve (1-2 dias)
const fetchLightTrainerLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("trainingDaysPerWeek", "<=", 2))
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}
\`\`\`

---

## 10. Queries Complexas (Múltiplos Filtros)

\`\`\`javascript
// Buscar mulheres iniciantes que querem perder peso
const fetchTargetedLeads = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(
    leadsRef,
    where("gender", "==", "mulher"),
    where("experience", "==", "iniciante"),
    where("goals", "array-contains", "perder-peso")
  )
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}

// Buscar homens avançados interessados em ganhar massa
const fetchMuscleGainers = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(
    leadsRef,
    where("gender", "==", "homem"),
    where("experience", "==", "avançado"),
    where("goals", "array-contains", "ganhar-massa")
  )
  
  const querySnapshot = await getDocs(q)
  const leads = []
  
  querySnapshot.forEach((doc) => {
    leads.push(doc.data())
  })
  
  return leads
}
\`\`\`

---

## 11. Contar Leads por Categoria

\`\`\`javascript
// Contar leads por objetivo
const countLeadsByGoal = async () => {
  const allLeads = await fetchAllLeads()
  
  const goalCounts = {
    "perder-peso": 0,
    "ganhar-massa": 0,
    "melhorar-saude": 0,
    "definicao-muscular": 0
  }
  
  allLeads.forEach(lead => {
    lead.goals.forEach(goal => {
      if (goal in goalCounts) {
        goalCounts[goal]++
      }
    })
  })
  
  return goalCounts
}

// Contar leads por experiência
const countLeadsByExperience = async () => {
  const allLeads = await fetchAllLeads()
  
  const experienceCounts = {
    "iniciante": 0,
    "intermediario": 0,
    "avançado": 0
  }
  
  allLeads.forEach(lead => {
    if (lead.experience in experienceCounts) {
      experienceCounts[lead.experience]++
    }
  })
  
  return experienceCounts
}

// Contar leads por gênero
const countLeadsByGender = async () => {
  const allLeads = await fetchAllLeads()
  
  const genderCounts = {
    "homem": 0,
    "mulher": 0
  }
  
  allLeads.forEach(lead => {
    if (lead.gender in genderCounts) {
      genderCounts[lead.gender]++
    }
  })
  
  return genderCounts
}
\`\`\`

---

## 12. Atualizar Status de um Lead

\`\`\`javascript
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"

// Mudar lead para cliente (depois do pagamento)
const convertLeadToCustomer = async (uid, planType) => {
  const leadRef = doc(db, "leads", uid)
  
  await updateDoc(leadRef, {
    status: "customer",
    convertedAt: new Date(),
    planType: planType,
    subscriptionStatus: "active"
  })
  
  console.log("Lead convertido para cliente:", uid)
}

// Marcar lead como inativo
const markLeadAsInactive = async (uid) => {
  const leadRef = doc(db, "leads", uid)
  
  await updateDoc(leadRef, {
    status: "inactive",
    inactivatedAt: new Date()
  })
  
  console.log("Lead marcado como inativo:", uid)
}
\`\`\`

---

## 13. Segmentação Avançada para Marketing

\`\`\`javascript
// Buscar leads de alto potencial
const fetchHighValueLeads = async () => {
  // Critérios: avançados, interessados em suplemento, treinam 4+ dias
  const allLeads = await fetchAllLeads()
  
  return allLeads.filter(lead => 
    lead.experience === "avançado" &&
    lead.wantsSupplement === "sim" &&
    lead.trainingDaysPerWeek >= 4
  )
}

// Buscar leads de conversão fácil
const fetchEasyConversionLeads = async () => {
  // Critérios: iniciantes, com objetivo claro, com tempo disponível
  const allLeads = await fetchAllLeads()
  
  return allLeads.filter(lead => 
    lead.experience === "iniciante" &&
    lead.goals.length > 0 &&
    lead.trainingDaysPerWeek >= 3
  )
}

// Buscar leads "em risco"
const fetchAtRiskLeads = async () => {
  // Critérios: sem experiência, sem tempo, muitos problemas anteriores
  const allLeads = await fetchAllLeads()
  
  return allLeads.filter(lead => 
    lead.experience === "iniciante" &&
    lead.trainingDaysPerWeek <= 2 &&
    lead.previousProblems.length > 2
  )
}
\`\`\`

---

## 14. Exportar Leads para CSV

\`\`\`javascript
const exportLeadsToCSV = async () => {
  const allLeads = await fetchAllLeads()
  
  // Definir colunas
  const headers = ["ID", "Nome", "Email", "Gênero", "Idade", "Objetivo", "Experiência", "Status"]
  
  // Criar linhas
  const rows = allLeads.map(lead => [
    lead.id,
    lead.name,
    lead.email,
    lead.gender,
    lead.age,
    lead.goals.join(", "),
    lead.experience,
    lead.status
  ])
  
  // Converter para CSV
  const csv = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n")
  
  // Download
  const blob = new Blob([csv], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "leads.csv"
  a.click()
}
\`\`\`

---

## Exemplo Completo: Dashboard de Leads

\`\`\`javascript
// Hook customizado para gerenciar leads
import { useState, useEffect } from "react"

export const useLeads = () => {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    byGoal: {},
    byExperience: {},
    byGender: {}
  })
  
  useEffect(() => {
    loadLeads()
  }, [])
  
  const loadLeads = async () => {
    try {
      setLoading(true)
      const allLeads = await fetchAllLeads()
      setLeads(allLeads)
      
      // Calcular estatísticas
      const totalLeads = allLeads.length
      const byGoal = {}
      const byExperience = {}
      const byGender = {}
      
      allLeads.forEach(lead => {
        // By Goal
        lead.goals.forEach(goal => {
          byGoal[goal] = (byGoal[goal] || 0) + 1
        })
        
        // By Experience
        byExperience[lead.experience] = (byExperience[lead.experience] || 0) + 1
        
        // By Gender
        byGender[lead.gender] = (byGender[lead.gender] || 0) + 1
      })
      
      setStats({
        total: totalLeads,
        byGoal,
        byExperience,
        byGender
      })
    } catch (error) {
      console.error("Erro ao carregar leads:", error)
    } finally {
      setLoading(false)
    }
  }
  
  return { leads, loading, stats, refetch: loadLeads }
}

// Usar no componente
function LeadsDashboard() {
  const { leads, loading, stats } = useLeads()
  
  if (loading) return <div>Carregando...</div>
  
  return (
    <div>
      <h1>Dashboard de Leads</h1>
      <p>Total: {stats.total}</p>
      <p>Homens: {stats.byGender.homem || 0}</p>
      <p>Mulheres: {stats.byGender.mulher || 0}</p>
      
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Objetivo</th>
            <th>Experiência</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr key={lead.id}>
              <td>{lead.name}</td>
              <td>{lead.email}</td>
              <td>{lead.goals.join(", ")}</td>
              <td>{lead.experience}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
\`\`\`

---

## Resumo de Operações Úteis

| Operação | Função |
|----------|--------|
| Buscar todos os leads | `fetchAllLeads()` |
| Buscar lead específico | `fetchLead(uid)` |
| Filtrar por objetivo | `query(where("goals", "array-contains", goal))` |
| Filtrar por experiência | `query(where("experience", "==", level))` |
| Filtrar por gênero | `query(where("gender", "==", gender))` |
| Contar leads | `fetchAllLeads().length` |
| Converter para cliente | `convertLeadToCustomer(uid, planType)` |
| Exportar CSV | `exportLeadsToCSV()` |

---

## Notas Importantes

1. **Indizes**: Para queries complexas, crie índices no Firebase Console
2. **Limites**: Firestore tem limite de 10 cláusulas `where` por query
3. **Performance**: Use paginação para listas grandes
4. **Real-time**: Use `onSnapshot()` para atualizações em tempo real
5. **Segurança**: Sempre valide no Backend/Firestore Rules
