import { redirect } from 'next/navigation'

export default function OfertaPage() {
  // Redireciona para o arquivo HTML estático em public/
  redirect('/oferta.html')
}
