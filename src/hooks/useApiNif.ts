import { useEstabelecimento } from "@/app/components/EstabelecimentoContext"
import { useMemo } from "react"

export function useApiNif() {
  const { nifSelecionado, filialSelecionada, isLoaded } = useEstabelecimento()

  return useMemo(() => {
    // Só retornar dados se estiver carregado E tiver um NIF selecionado
    if (!isLoaded || !nifSelecionado) {
      return null
    }
    
    if (filialSelecionada) {
      return { nif: nifSelecionado, filial: filialSelecionada }
    }
    return { nif: nifSelecionado }
  }, [isLoaded, nifSelecionado, filialSelecionada])
} 