"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Star, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DepoimentosPage() {
  const router = useRouter()

  // Lista de depoimentos (os 3 originais + 23 adicionais)
  const depoimentos = [
    {
      nome: "Maria Clara",
      iniciais: "MC",
      texto:
        "Perdi 12kg em 3 meses! O plano foi feito exatamente para minha rotina corrida de mãe. Os treinos de 20 minutos cabem perfeitamente no meu dia.",
      info: "Perdeu 12kg • Mãe de 2 filhos",
    },
    {
      nome: "Rafael Santos",
      iniciais: "RS",
      texto:
        "Finalmente um plano que funciona! Ganhei 8kg de massa muscular em 4 meses. A dieta vegana personalizada foi perfeita para mim.",
      info: "Ganhou 8kg de massa • Vegano",
    },
    {
      nome: "Ana Luiza",
      iniciais: "AL",
      texto:
        "Aos 45 anos consegui o melhor shape da minha vida! O plano considerou minha artrose no joelho e criou exercícios alternativos perfeitos.",
      info: "45 anos • Melhor forma física",
    },
    {
      nome: "Carlos Mendes",
      iniciais: "CM",
      texto:
        "Meu metabolismo sempre foi lento, mas o plano personalizado me ajudou a perder 15kg em 6 meses sem efeito sanfona!",
      info: "Perdeu 15kg • Metabolismo lento",
    },
    {
      nome: "Juliana Ferreira",
      iniciais: "JF",
      texto:
        "Como diabética, sempre tive medo de dietas. O plano adaptado às minhas necessidades médicas foi um divisor de águas.",
      info: "Diabética • Perdeu 8kg com segurança",
    },
    {
      nome: "Pedro Almeida",
      iniciais: "PA",
      texto:
        "Trabalho 12h por dia e mesmo assim consegui seguir o plano. Os treinos curtos e intensos fizeram toda diferença!",
      info: "Executivo • Ganhou definição muscular",
    },
    {
      nome: "Fernanda Lima",
      iniciais: "FL",
      texto:
        "Após a gravidez, achei que nunca mais teria meu corpo de volta. Em 5 meses recuperei minha forma e autoestima!",
      info: "Pós-parto • Recuperou forma física",
    },
    {
      nome: "Marcelo Souza",
      iniciais: "MS",
      texto:
        "Aos 52 anos, reduzi meu colesterol e pressão arterial seguindo o plano. Meu médico ficou impressionado com os resultados!",
      info: "52 anos • Melhorou saúde cardiovascular",
    },
    {
      nome: "Camila Rocha",
      iniciais: "CR",
      texto:
        "Como vegetariana, sempre tive dificuldade com proteínas. O plano nutricional personalizado resolveu esse problema!",
      info: "Vegetariana • Ganhou 5kg de massa magra",
    },
    {
      nome: "Bruno Costa",
      iniciais: "BC",
      texto: "Treino em casa com equipamentos mínimos e mesmo assim consegui resultados incríveis. O app é genial!",
      info: "Treino em casa • Transformação em 90 dias",
    },
    {
      nome: "Luciana Mello",
      iniciais: "LM",
      texto:
        "Tenho escoliose e sempre tive medo de academia. O plano adaptado fortaleceu minhas costas e reduziu minhas dores!",
      info: "Escoliose • Fortalecimento postural",
    },
    {
      nome: "Ricardo Oliveira",
      iniciais: "RO",
      texto: "Sempre fui o 'magro' que não conseguia ganhar massa. Em 6 meses ganhei 10kg de músculos!",
      info: "Ectomorfo • Ganhou 10kg de massa",
    },
    {
      nome: "Amanda Dias",
      iniciais: "AD",
      texto: "Como modelo, preciso manter meu corpo em forma. O plano me ajuda a ficar definida sem perder curvas!",
      info: "Modelo • Definição sem perda muscular",
    },
    {
      nome: "Felipe Torres",
      iniciais: "FT",
      texto:
        "Trabalho viajando e mesmo assim consigo seguir o plano. Os exercícios adaptados para hotel são perfeitos!",
      info: "Viaja a trabalho • Mantém consistência",
    },
    {
      nome: "Daniela Castro",
      iniciais: "DC",
      texto:
        "Tenho PCOS e sempre lutei contra o ganho de peso. O plano personalizado me ajudou a perder 14kg em 8 meses!",
      info: "PCOS • Perdeu 14kg",
    },
    {
      nome: "Gustavo Martins",
      iniciais: "GM",
      texto:
        "Como cadeirante, achei que não conseguiria resultados. O plano adaptado para mim mudou completamente minha vida!",
      info: "Cadeirante • Ganhou força superior",
    },
    {
      nome: "Patrícia Lemos",
      iniciais: "PL",
      texto:
        "Aos 60 anos, recuperei energia e disposição que não tinha há décadas. Meus netos mal conseguem me acompanhar agora!",
      info: "60 anos • Ganhou vitalidade",
    },
    {
      nome: "Henrique Gomes",
      iniciais: "HG",
      texto:
        "Sou fisiculturista amador e o plano me ajudou a quebrar meu platô. Finalmente consegui os resultados que buscava!",
      info: "Fisiculturista • Superou platô",
    },
    {
      nome: "Bianca Campos",
      iniciais: "BC",
      texto:
        "Como enfermeira em turnos rotativos, nunca tinha tempo para mim. Os treinos de 15 minutos transformaram meu corpo!",
      info: "Enfermeira • Adaptou treinos aos turnos",
    },
    {
      nome: "Leonardo Silva",
      iniciais: "LS",
      texto:
        "Após uma lesão no joelho, achei que não poderia mais treinar forte. O plano adaptado me provou o contrário!",
      info: "Recuperação de lesão • Voltou mais forte",
    },
    {
      nome: "Mariana Duarte",
      iniciais: "MD",
      texto: "Como mãe solo de 3 filhos, nunca tinha tempo para mim. Os treinos de 15 minutos transformaram meu corpo!",
      info: "Mãe solo • Transformação em 4 meses",
    },
    {
      nome: "Roberto Freitas",
      iniciais: "RF",
      texto:
        "Aos 48 anos, recuperei a massa muscular que tinha aos 30! Minha esposa não para de elogiar minha transformação.",
      info: "48 anos • Recuperou massa muscular",
    },
    {
      nome: "Carla Mendonça",
      iniciais: "CM",
      texto: "Sempre odiei academia, mas os treinos personalizados mudaram minha visão. Agora não vivo sem exercícios!",
      info: "Ex-sedentária • Adepta de exercícios",
    },
    {
      nome: "Paulo Ribeiro",
      iniciais: "PR",
      texto:
        "Como empresário sem tempo, achava impossível cuidar da saúde. O plano me mostrou que é possível conciliar tudo!",
      info: "Empresário • Ganhou qualidade de vida",
    },
    {
      nome: "Tatiana Moraes",
      iniciais: "TM",
      texto:
        "Após 3 cesáreas, achei que minha barriga nunca mais seria a mesma. Em 6 meses, recuperei minha autoestima!",
      info: "Pós-cesáreas • Recuperou abdômen",
    },
    {
      nome: "Eduardo Peixoto",
      iniciais: "EP",
      texto: "Como professor universitário com rotina caótica, o plano adaptável foi perfeito. Perdi 18kg em 7 meses!",
      info: "Professor • Perdeu 18kg",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center">
          <img
            src="/images/fitgoal-logo-black.webp"
            alt="FitGoal Logo"
            className="h-8 w-auto dark:hidden"
            onError={(e) => {
              e.currentTarget.style.display = "none"
              e.currentTarget.nextElementSibling.style.display = "flex"
            }}
          />
          <img
            src="/images/fitgoal-logo.webp"
            alt="FitGoal Logo"
            className="h-8 w-auto hidden dark:block"
            onError={(e) => {
              e.currentTarget.style.display = "none"
              e.currentTarget.nextElementSibling.style.display = "flex"
            }}
          />
          {/* Fallback logo */}
          <div className="hidden bg-lime-500 px-3 py-1 rounded">
            <span className="text-white text-sm font-bold">FITGOAL</span>
          </div>
        </div>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="border-lime-500 text-lime-500 hover:bg-lime-500 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </header>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Depoimentos dos Nossos Usuários</h1>
          <p className="text-xl text-gray-300">Veja como o FITGOAL está transformando vidas</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {depoimentos.map((depoimento, index) => (
            <Card key={index} className="bg-gray-700 border-gray-600 p-6">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">"{depoimento.texto}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center mr-4">
                    <span className="font-bold text-white">{depoimento.iniciais}</span>
                  </div>
                  <div>
                    <p className="font-bold text-white">{depoimento.nome}</p>
                    <p className="text-gray-400 text-sm">{depoimento.info}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button
            onClick={() => router.push("/")}
            className="bg-lime-500 hover:bg-lime-600 text-white py-6 px-8 text-lg rounded-full"
          >
            Quero Transformar Meu Corpo Também
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 bg-gray-900 mt-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <img
              src="/images/fitgoal-logo-black.webp"
              alt="FitGoal Logo"
              className="h-16 w-auto dark:hidden"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                e.currentTarget.nextElementSibling.style.display = "flex"
              }}
            />
            <img
              src="/images/fitgoal-logo.webp"
              alt="FitGoal Logo"
              className="h-16 w-auto hidden dark:block"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                e.currentTarget.nextElementSibling.style.display = "flex"
              }}
            />
            <div className="hidden bg-lime-500 px-6 py-3 rounded">
              <span className="text-white text-xl font-bold">FITGOAL</span>
            </div>
          </div>
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} FITGOAL. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
