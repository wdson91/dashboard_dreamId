import { useEstabelecimento } from "@/app/components/EstabelecimentoContext"
import { APP_CONFIG } from "@/lib/constants"

export function useApiNif() {
  const { nifSelecionado } = useEstabelecimento()
  
  // Retorna o NIF selecionado se disponível, senão usa o NIF padrão das constantes
  return nifSelecionado || APP_CONFIG.api.nif
} 