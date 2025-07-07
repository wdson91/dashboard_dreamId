"use client"

import { RefreshCw } from "lucide-react"
import { useCooldown } from "./CooldownContext"

interface UpdateButtonProps {
  onUpdate: () => void
  disabled?: boolean
  refreshing?: boolean
}

export const UpdateButton = ({ onUpdate, disabled = false, refreshing = false }: UpdateButtonProps) => {
  const { cooldownCountdown, isInCooldown, triggerRefresh } = useCooldown()
  
  const handleClick = () => {
    if (isInCooldown) {
      return
    }
    triggerRefresh()
    onUpdate()
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled || isInCooldown}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isInCooldown 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
          : 'bg-green-600 text-white hover:bg-green-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isInCooldown 
        ? `Aguarde ${cooldownCountdown}s para atualizar novamente` 
        : "Atualizar dados (mínimo 30s entre atualizações)"
      }
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">
        {isInCooldown ? `Aguarde ${cooldownCountdown}s` : 'Atualizar'}
      </span>
    </button>
  )
} 