"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowRight,
  CheckCircle,
  Dumbbell,
  Heart,
  Trophy,
  User,
  LogIn,
  Star,
  Clock,
  Target,
  Zap,
  Users,
  Award,
  TrendingUp,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// Dados dos depoimentos
const testimonials = [
  {
    id: 1,
    name: "Maria Clara",
    description: "Perdeu 12kg • Mãe de 2 filhos",
    text: "Perdi 12kg em 3 meses! O plano foi feito exatamente para minha rotina corrida de mãe. Os treinos de 20 minutos cabem perfeitamente no meu dia.",
    initials: "MC",
  },
  {
    id: 2,
    name: "Rafael Santos",
    description: "Ganhou 8kg de massa • Vegano",
    text: "Finalmente um plano que funciona! Ganhei 8kg de massa muscular em 4 meses. A dieta vegana personalizada foi perfeita para mim.",
    initials: "RS",
  },
  {
    id: 3,
    name: "Ana Luiza",
    description: "45 anos • Melhor forma física",
    text: "Aos 45 anos consegui o melhor shape da minha vida! O plano considerou minha artrose no joelho e criou exercícios alternativos perfeitos.",
    initials: "AL",
  },
  {
    id: 4,
    name: "Thiago Moreira",
    description: "Treina em casa • Definição muscular",
    text: "Treino em casa com apenas halteres e consegui resultados incríveis! O algoritmo criou um plano perfeito para meus equipamentos limitados.",
    initials: "TM",
  },
  {
    id: 5,
    name: "Juliana Silva",
    description: "IMC de 28 para 23 • 5 meses",
    text: "Depois de 3 tentativas frustradas com outros apps, finalmente encontrei algo que funciona! Meu IMC saiu de 28 para 23 em 5 meses.",
    initials: "JS",
  },
  {
    id: 6,
    name: "Pedro Costa",
    description: "Iniciante • Ganhou confiança",
    text: "Como iniciante total, estava perdido. O plano me guiou passo a passo e hoje me sinto confiante na academia. Mudou minha vida!",
    initials: "PC",
  },
  // Depoimentos adicionais
  {
    id: 7,
    name: "Fernanda Lima",
    description: "Perdeu 8kg • Executiva",
    text: "Mesmo com agenda lotada de reuniões, consegui seguir o plano! Os treinos curtos e a dieta prática se encaixaram perfeitamente na minha rotina.",
    initials: "FL",
  },
  {
    id: 8,
    name: "Carlos Eduardo",
    description: "Ganhou 10kg • Ectomorfo",
    text: "Sempre fui muito magro e tinha dificuldade para ganhar peso. Com o plano personalizado para ectomorfos, finalmente consegui resultados!",
    initials: "CE",
  },
  {
    id: 9,
    name: "Mariana Costa",
    description: "Pós-parto • Recuperou forma",
    text: "Após minha gravidez, achei que nunca mais teria meu corpo de volta. Em apenas 6 meses, voltei melhor do que antes!",
    initials: "MC",
  },
  {
    id: 10,
    name: "Roberto Alves",
    description: "50 anos • Ganhou disposição",
    text: "Aos 50 anos, minha energia estava no chão. Com o plano, não só melhorei minha forma física, mas minha disposição voltou como se tivesse 30!",
    initials: "RA",
  },
  {
    id: 11,
    name: "Camila Mendes",
    description: "Atleta amadora • Melhorou performance",
    text: "Como corredora amadora, o plano me ajudou a quebrar meus recordes pessoais. A nutrição específica para atletas fez toda diferença!",
    initials: "CM",
  },
  {
    id: 12,
    name: "Lucas Oliveira",
    description: "Perdeu 15kg • Diabético",
    text: "Mesmo com diabetes tipo 2, consegui perder 15kg com segurança. A dieta adaptada para minha condição foi fundamental.",
    initials: "LO",
  },
  {
    id: 13,
    name: "Patrícia Santos",
    description: "Ganhou definição • 3 meses",
    text: "Sempre tive dificuldade para definir abdômen. Com o plano personalizado, finalmente consegui ver meus músculos aparecerem!",
    initials: "PS",
  },
  {
    id: 14,
    name: "Henrique Gomes",
    description: "Recuperação de lesão • Joelho",
    text: "Após cirurgia no joelho, o plano me ajudou a recuperar força e mobilidade sem dor. Os exercícios adaptados foram perfeitos.",
    initials: "HG",
  },
  {
    id: 15,
    name: "Bianca Martins",
    description: "Vegetariana • Ganhou energia",
    text: "Como vegetariana, sempre me preocupei com proteínas. O plano nutricional me mostrou como obter todos os nutrientes sem carne!",
    initials: "BM",
  },
  {
    id: 16,
    name: "Gustavo Pereira",
    description: "Estudante • Ganhou 6kg de massa",
    text: "Mesmo com orçamento apertado de estudante, consegui seguir o plano e transformar meu corpo. As receitas econômicas ajudaram muito!",
    initials: "GP",
  },
  {
    id: 17,
    name: "Amanda Souza",
    description: "Mãe de 3 • Perdeu 14kg",
    text: "Após 3 filhos, achei que jamais voltaria a me sentir bem com meu corpo. Em 6 meses, perdi 14kg e recuperei minha autoestima!",
    initials: "AS",
  },
  {
    id: 18,
    name: "Ricardo Mendes",
    description: "Empresário • Ganhou qualidade de vida",
    text: "Minha rotina de trabalho era caótica, mas o plano se adaptou perfeitamente. Hoje tenho mais energia para trabalhar e para minha família.",
    initials: "RM",
  },
  {
    id: 19,
    name: "Daniela Castro",
    description: "Professora • Perdeu 10kg",
    text: "Como professora, passava o dia todo em pé e chegava exausta em casa. O plano me deu energia e ainda perdi 10kg!",
    initials: "DC",
  },
  {
    id: 20,
    name: "Felipe Rodrigues",
    description: "Ganhou definição • Mesomorfo",
    text: "Sempre tive facilidade para ganhar massa, mas dificuldade para definir. O plano para mesomorfos me ajudou a atingir o equilíbrio perfeito.",
    initials: "FR",
  },
  {
    id: 21,
    name: "Tatiana Lima",
    description: "Perdeu 18kg • Endomorfa",
    text: "Como endomorfa, sempre lutei contra o ganho de peso. O plano personalizado me ensinou a comer certo e perdi 18kg em 8 meses!",
    initials: "TL",
  },
  {
    id: 22,
    name: "Bruno Almeida",
    description: "Ganhou resistência • Ciclista",
    text: "Como ciclista amador, o plano melhorou minha resistência e performance. Agora consigo pedalar o dobro da distância sem cansar!",
    initials: "BA",
  },
  {
    id: 23,
    name: "Carla Vieira",
    description: "Perdeu 7kg • Hipotireoidismo",
    text: "Mesmo com hipotireoidismo, que dificultava muito a perda de peso, consegui perder 7kg com o plano adaptado para minha condição.",
    initials: "CV",
  },
  {
    id: 24,
    name: "Marcelo Santos",
    description: "Ganhou massa • Treino em casa",
    text: "Sem tempo para academia, consegui montar uma mini academia em casa e seguir o plano. Ganhei 7kg de massa muscular em 5 meses!",
    initials: "MS",
  },
  {
    id: 25,
    name: "Luciana Ferreira",
    description: "Melhorou postura • Trabalho sentada",
    text: "Trabalho 8h por dia sentada e tinha sérios problemas de postura. O plano não só melhorou minha forma física, mas também minha postura!",
    initials: "LF",
  },
  {
    id: 26,
    name: "Paulo Ribeiro",
    description: "Ganhou saúde • Baixou colesterol",
    text: "Meu médico estava preocupado com meu colesterol. Após 4 meses no plano, todos os meus exames voltaram ao normal. Meu médico ficou impressionado!",
    initials: "PR",
  },
  {
    id: 27,
    name: "Renata Oliveira",
    description: "Perdeu 9kg • Menopausa",
    text: "Durante a menopausa, meu metabolismo mudou completamente. O plano me ajudou a entender essas mudanças e perder 9kg mesmo nessa fase difícil.",
    initials: "RO",
  },
  {
    id: 28,
    name: "Diego Martins",
    description: "Ganhou definição • Sem suplementos",
    text: "Consegui definir meu corpo sem usar nenhum suplemento, apenas com a dieta personalizada. Os resultados superaram minhas expectativas!",
    initials: "DM",
  },
  {
    id: 29,
    name: "Vanessa Campos",
    description: "Perdeu 11kg • Ansiedade alimentar",
    text: "Sempre tive compulsão alimentar por ansiedade. O plano me ajudou não só fisicamente, mas também a ter uma relação mais saudável com a comida.",
    initials: "VC",
  },
]

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const goToAuth = (mode: "login" | "register") => {
    router.push(`/auth?mode=${mode}`)
  }

  const [showAllTestimonials, setShowAllTestimonials] = useState(false)

  const startQuiz = () => {
    setLoading(true)
    setTimeout(() => {
      router.push("/quiz")
    }, 500)
  }

  const goToCheckout = (plan: string) => {
    router.push(`/checkout?plan=${plan}`)
  }

  // Primeiros 6 depoimentos fixos
  const fixedTestimonials = testimonials.slice(0, 6)
  // Depoimentos adicionais que serão mostrados ao clicar em "Ver mais"
  const additionalTestimonials = testimonials.slice(6)

  const plans = {
    mensal: {
      name: "Plano Mensal",
      originalPrice: 99.9, // Ajustado para um valor base para cálculo de economia
      price: 79.9,
      period: "mês",
      total: 79.9,
      savings: 20.0, // 99.90 - 79.90
      savePercentage: "20%", // (20.00 / 99.90) * 100
      color: "lime",
      features: ["Treino personalizado", "Dieta personalizada", "Suporte via chat"],
    },
    trimestral: {
      name: "Plano Trimestral",
      originalPrice: 99.9,
      price: 57.9,
      period: "mês",
      total: 57.9 * 3, // Total para 3 meses
      savings: 99.9 - 57.9, // Economia por mês
      savePercentage: "42%", // (42.00 / 99.90) * 100
      color: "orange",
      popular: true,
      features: ["Tudo do plano mensal", "Ajustes mensais do plano", "Relatórios de progresso"],
    },
    semestral: {
      name: "Plano Semestral",
      originalPrice: 99.9,
      price: 64.9,
      period: "mês",
      total: 64.9 * 6, // Total para 6 meses
      savings: 99.9 - 64.9, // Economia por mês
      savePercentage: "35%", // (35.00 / 99.90) * 100
      color: "purple",
      bestValue: true,
      features: ["Tudo dos planos anteriores", "Consultoria nutricional", "Suporte prioritário"],
    },
    anual: {
      name: "Plano Anual",
      originalPrice: 99.9,
      price: 49.9,
      period: "mês",
      total: 49.9 * 12, // Total para 12 meses
      savings: 99.9 - 49.9, // Economia por mês
      savePercentage: "50%", // (50.00 / 99.90) * 100
      color: "yellow",
      premium: true,
      features: ["Tudo dos planos anteriores", "Acompanhamento pessoal", "Acesso vitalício"],
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white font-['Inter',sans-serif]">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center">
          <img
            src="/images/fitgoal-logo.png"
            alt="FitGoal Logo"
            className="h-24 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = "none"
              e.currentTarget.nextElementSibling.style.display = "flex"
            }}
          />
          <div className="hidden bg-lime-500 px-8 py-4 rounded-xl">
            <span className="text-white text-3xl font-bold">FitGoal</span>
          </div>
        </div>
        <div className="flex space-x-4">
          <Button
            onClick={() => goToAuth("login")}
            variant="outline"
            className="border-lime-500 text-lime-500 hover:bg-lime-500 hover:text-white"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Entrar
          </Button>
          <Button onClick={() => goToAuth("register")} className="bg-lime-500 hover:bg-lime-600 text-white">
            <User className="h-4 w-4 mr-2" />
            Registrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 md:py-24 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center bg-lime-500/20 text-lime-400 px-4 py-2 rounded-full text-sm font-medium">
              <Star className="h-4 w-4 mr-2" />
              Mais de 18.948 pessoas transformadas
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Treinos e Dietas <span className="text-lime-400">100% Personalizados</span> Para Você
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Chega de planos genéricos! Criamos seu programa de treino e alimentação baseado no SEU corpo, SUA rotina e
              SEUS objetivos. Resultados reais em tempo recorde.
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <p className="text-lg">Plano de treino adaptado ao seu biotipo e equipamentos disponíveis</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <p className="text-lg">Dieta personalizada baseada nas suas preferências alimentares</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <p className="text-lg">Análise completa do seu IMC e orientações de saúde</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <p className="text-lg">Resultados visíveis em apenas 4 semanas</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={startQuiz}
                disabled={loading}
                className="bg-gradient-to-r from-lime-300 via-lime-400 to-lime-500 hover:from-lime-400 hover:via-lime-500 hover:to-lime-600 text-black py-12 px-20 text-4xl font-black rounded-full flex items-center justify-center space-x-4 shadow-[0_0_50px_rgba(132,204,22,0.8)] transform hover:scale-125 transition-all duration-500 border-8 border-white hover:border-lime-200 animate-pulse hover:animate-bounce ring-8 ring-lime-300/50 hover:ring-lime-200/70 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-1000"
                style={{
                  filter: "drop-shadow(0 0 20px #84cc16) drop-shadow(0 0 40px #84cc16)",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                <span className="relative z-10">Fazer Quiz Gratuito</span>
                <ArrowRight className="h-12 w-12 relative z-10" />
              </Button>
              <div className="text-center sm:text-left">
                <p className="text-sm text-gray-400">✅ Quiz 100% Gratuito</p>
                <p className="text-sm text-gray-400">⚡ Resultado em 5 minutos</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <img
              src="/images/fitness-couple-new.png"
              alt="Casal fitness"
              className="object-contain h-auto w-full"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=400&width=300"
              }}
            />
            <div className="absolute -bottom-4 -right-4 bg-lime-500 p-4 rounded-full shadow-lg">
              <Dumbbell className="h-8 w-8" />
            </div>
            <div className="absolute -top-4 -left-4 bg-gradient-to-r from-lime-400 to-lime-600 p-3 rounded-full shadow-lg">
              <Heart className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {/* Estatísticas */}
      <section className="px-6 py-16 bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-lime-400 mb-2">18.948</div>
              <p className="text-gray-300">Pessoas Transformadas</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-lime-400 mb-2">94%</div>
              <p className="text-gray-300">Taxa de Sucesso</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-lime-400 mb-2">4.9</div>
              <p className="text-gray-300">Avaliação Média</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-lime-400 mb-2">28</div>
              <p className="text-gray-300">Dias Médios para Resultados</p>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              Como Criamos Seu Plano <span className="text-lime-400">100% Personalizado</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Nosso algoritmo inteligente analisa mais de 23 fatores únicos sobre você para criar o plano perfeito
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gray-800 border-gray-700 p-8 text-center">
              <div className="bg-lime-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">1. Quiz Personalizado</h3>
              <p className="text-gray-300 leading-relaxed">
                Analisamos seu biotipo, objetivos, preferências alimentares, equipamentos disponíveis, experiência e
                muito mais
              </p>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-8 text-center">
              <div className="bg-lime-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">2. IA Personalizada</h3>
              <p className="text-gray-300 leading-relaxed">
                Nossa inteligência artificial cria treinos e dietas únicos, considerando sua rotina e limitações
                específicas
              </p>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-8 text-center">
              <div className="bg-lime-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">3. Resultados Garantidos</h3>
              <p className="text-gray-300 leading-relaxed">
                Receba seu plano otimizado e acompanhe sua evolução com métricas precisas e ajustes automáticos
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Planos e Preços */}
      <section className="px-6 py-20 bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              Escolha Seu <span className="text-lime-400">Plano Ideal</span>
            </h2>
            <p className="text-xl text-gray-300">
              Transforme seu corpo com nossos planos personalizados. Quanto mais tempo, maior o desconto!
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Plano Mensal */}
            <Card className="bg-gray-700 border-gray-600 p-6 text-center relative">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold text-white mb-4">Mensal</h3>
                <div className="mb-6">
                  <div className="text-gray-400 line-through text-lg">R$ 147,90</div>
                  <div className="text-4xl font-bold text-lime-400">R$ 79,90</div>
                  <div className="text-gray-300 text-sm">por mês</div>
                </div>
                <div className="text-lime-400 text-xs font-bold">ECONOMIZE 46%</div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-lime-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Treino personalizado</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-lime-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Dieta personalizada</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-lime-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Suporte via chat</span>
                  </li>
                </ul>
                <Button
                  onClick={() => goToCheckout("mensal")}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-white"
                >
                  Escolher Plano
                </Button>
              </CardContent>
            </Card>

            {/* Plano Trimestral */}
            <Card className="bg-gray-700 border-gray-600 p-6 text-center relative">
              <CardContent className="p-0">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  POPULAR
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Trimestral</h3>
                <div className="mb-6">
                  <div className="text-gray-400 line-through text-lg">R$ 97,90/mês</div>
                  <div className="text-4xl font-bold text-lime-400">R$ 57,90</div>
                  <div className="text-gray-300 text-sm">por mês</div>
                  <div className="text-orange-400 text-xs font-bold">ECONOMIZE 41%</div>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-lime-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Tudo do plano mensal</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-lime-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Ajustes mensais do plano</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-lime-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Relatórios de progresso</span>
                  </li>
                </ul>
                <Button
                  onClick={() => goToCheckout("trimestral")}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Escolher Plano
                </Button>
              </CardContent>
            </Card>

            {/* Plano Semestral */}
            <Card className="bg-gray-700 border-gray-600 p-6 text-center relative">
              <CardContent className="p-0">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  MELHOR CUSTO
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Semestral</h3>
                <div className="mb-6">
                  <div className="text-gray-400 line-through text-lg">R$ 77,90/mês</div>
                  <div className="text-4xl font-bold text-lime-400">R$ 64,90</div>
                  <div className="text-gray-300 text-sm">por mês</div>
                  <div className="text-purple-400 text-xs font-bold">ECONOMIZE 17%</div>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-lime-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Tudo dos planos anteriores</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-lime-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Consultoria nutricional</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-lime-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Suporte prioritário</span>
                  </li>
                </ul>
                <Button
                  onClick={() => goToCheckout("semestral")}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Escolher Plano
                </Button>
              </CardContent>
            </Card>

            {/* Plano Anual */}
            <Card className="bg-gradient-to-b from-yellow-500/20 to-yellow-600/20 border-yellow-500 p-6 text-center relative">
              <CardContent className="p-0">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center">
                  <Crown className="h-3 w-3 mr-1" />
                  PREMIUM
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Anual</h3>
                <div className="mb-6">
                  <div className="text-gray-400 line-through text-lg">R$ 67,90/mês</div>
                  <div className="text-4xl font-bold text-yellow-400">R$ 49,90</div>
                  <div className="text-gray-300 text-sm">por mês</div>
                  <div className="text-yellow-400 text-xs font-bold">ECONOMIZE 26%</div>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Tudo dos planos anteriores</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Acompanhamento pessoal</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">Acesso vitalício</span>
                  </li>
                </ul>
                <Button
                  onClick={() => goToCheckout("anual")}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Escolher Premium
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-400 text-sm">
              ✅ Garantia de 30 dias • 🔒 Pagamento 100% seguro • 🎯 Resultados comprovados
            </p>
          </div>
        </div>
      </section>

      {/* Features Detalhadas */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            O Que Torna Nosso Método <span className="text-lime-400">Único</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6">Treinos Inteligentes</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-lime-500 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Adaptado ao Seu Biotipo</h4>
                    <p className="text-gray-300">Exercícios específicos para ectomorfo, mesomorfo ou endomorfo</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-lime-500 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Flexível à Sua Rotina</h4>
                    <p className="text-gray-300">Treinos de 15 minutos a 1 hora, conforme seu tempo disponível</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-lime-500 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Progressão Inteligente</h4>
                    <p className="text-gray-300">Evolução automática baseada no seu progresso e feedback</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-bold mb-6">Nutrição Personalizada</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-lime-500 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Baseada no Seu IMC</h4>
                    <p className="text-gray-300">Calorias e macros calculados precisamente para seus objetivos</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-lime-500 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Respeita Suas Preferências</h4>
                    <p className="text-gray-300">Vegano, vegetariano, keto ou qualquer restrição alimentar</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-lime-500 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Ajustes Automáticos</h4>
                    <p className="text-gray-300">Plano se adapta conforme você atinge suas metas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="px-6 py-20 bg-gray-800 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            O Que Nossos <span className="text-lime-400">Usuários Dizem</span>
          </h2>

          {/* Depoimentos fixos - sempre visíveis */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {fixedTestimonials.map((testimonial) => (
              <Card key={testimonial.id} className="bg-gray-700 border-gray-600 p-6">
                <CardContent className="p-0">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 italic">"{testimonial.text}"</p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center mr-4">
                      <span className="font-bold text-white">{testimonial.initials}</span>
                    </div>
                    <div>
                      <p className="font-bold text-white">{testimonial.name}</p>
                      <p className="text-gray-400 text-sm">{testimonial.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Botão Ver Mais */}
          <div className="text-center mb-8">
            <Button
              onClick={() => setShowAllTestimonials(!showAllTestimonials)}
              variant="outline"
              className="border-lime-500 text-lime-500 hover:bg-lime-500 hover:text-white"
            >
              {showAllTestimonials ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Ver mais depoimentos
                </>
              )}
            </Button>
          </div>

          {/* Depoimentos adicionais - visíveis apenas quando showAllTestimonials é true */}
          {showAllTestimonials && (
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              {additionalTestimonials.map((testimonial) => (
                <Card key={testimonial.id} className="bg-gray-700 border-gray-600 p-6">
                  <CardContent className="p-0">
                    <div className="flex items-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-300 mb-6 italic">"{testimonial.text}"</p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center mr-4">
                        <span className="font-bold text-white">{testimonial.initials}</span>
                      </div>
                      <div>
                        <p className="font-bold text-white">{testimonial.name}</p>
                        <p className="text-gray-400 text-sm">{testimonial.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Garantia e Urgência */}
      <section className="px-6 py-16 bg-gradient-to-r from-lime-500 to-lime-600">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <Award className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-6">Garantia de Resultados em 30 Dias</h2>
            <p className="text-xl mb-8 text-white/90">
              Se você não ver resultados em 30 dias seguindo nosso plano personalizado, devolvemos 100% do seu
              investimento. Sem perguntas, sem complicações.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 rounded-lg p-4">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p className="font-bold">18.948 Pessoas</p>
                <p className="text-sm text-white/80">Já transformaram seus corpos</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-bold">94% de Sucesso</p>
                <p className="text-sm text-white/80">Taxa de satisfação comprovada</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p className="font-bold">Resultados em 4 Semanas</p>
                <p className="text-sm text-white/80">Tempo médio para ver mudanças</p>
              </div>
            </div>
            <Button
              onClick={startQuiz}
              disabled={loading}
              className="bg-gradient-to-r from-lime-300 via-lime-400 to-lime-500 hover:from-lime-400 hover:via-lime-500 hover:to-lime-600 text-black py-12 px-24 text-4xl font-black rounded-full shadow-[0_0_50px_rgba(132,204,22,0.8)] transform hover:scale-125 transition-all duration-500 border-8 border-white hover:border-lime-200 animate-pulse hover:animate-bounce ring-8 ring-lime-300/50 hover:ring-lime-200/70 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-1000"
              style={{
                filter: "drop-shadow(0 0 20px #84cc16) drop-shadow(0 0 40px #84cc16)",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
              }}
            >
              Fazer Quiz e Ver Planos
            </Button>
            <p className="text-sm text-white/80 mt-4">⚡ Mais de 200 pessoas criaram seu plano hoje</p>
          </div>
        </div>
      </section>

      {/* FAQ Rápido */}
      <section className="px-6 py-16 bg-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-lime-400 mb-3">É realmente personalizado?</h3>
              <p className="text-gray-300">
                Sim! Analisamos 23+ fatores únicos sobre você para criar um plano 100% personalizado.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-lime-400 mb-3">Funciona para iniciantes?</h3>
              <p className="text-gray-300">
                Perfeitamente! Nosso algoritmo adapta exercícios e intensidade ao seu nível de experiência.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-lime-400 mb-3">E se eu não tiver equipamentos?</h3>
              <p className="text-gray-300">
                Sem problema! Criamos treinos eficazes com peso corporal ou equipamentos que você tem em casa.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-lime-400 mb-3">Posso cancelar quando quiser?</h3>
              <p className="text-gray-300">
                Sim! Você pode cancelar sua assinatura a qualquer momento sem taxas ou multas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-gray-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <img
              src="/images/fitgoal-logo.png"
              alt="FitGoal Logo"
              className="h-16 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                e.currentTarget.nextElementSibling.style.display = "flex"
              }}
            />
            <div className="hidden bg-lime-500 px-6 py-3 rounded">
              <span className="text-white text-xl font-bold">FitGoal</span>
            </div>
          </div>
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} FitGoal. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
