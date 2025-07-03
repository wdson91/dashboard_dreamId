import { useEstabelecimento } from "@/app/components/EstabelecimentoContext"


export function useApiNif() {
  const { nifSelecionado, isLoaded } = useEstabelecimento()
  
  // Se ainda não carregou, retorna null para evitar mostrar NIF padrão
  if (!isLoaded) {
    return null
  }
  
  // Retorna o NIF selecionado se disponível, senão retorna null
  // Isso permite que as páginas tratem o caso de usuário sem estabelecimentos
  return nifSelecionado || null
} 