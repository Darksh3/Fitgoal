"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

const ResultsPage = () => {
  const [discount, setDiscount] = useState(0)

  return (
    <div>
      <Button
        onClick={() => {
          const prizes = [10, 15, 20, 30, 40, 50]
          setDiscount(prizes[Math.floor(Math.random() * prizes.length)])
        }}
        className="w-full bg-red-600 hover:bg-red-700 h-16 rounded-2xl text-xl font-black shadow-lg shadow-red-600/20"
      >
        GIRAR E GANHAR!
      </Button>
      {discount > 0 && <p>Você ganhou um desconto de {discount}%!</p>}
    </div>
  )
}

export default ResultsPage
