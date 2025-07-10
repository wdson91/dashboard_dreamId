'use client'
import { useLanguage } from './LanguageContext'
import { Globe } from 'lucide-react'

const languages = [
    { code: 'pt', flag: '🇵🇹', name: 'Português' },
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'es', flag: '🇪🇸', name: 'Español' }
]

export const LanguageSelector = () => {
    const { currentLanguage, setLanguage } = useLanguage()

    const currentLanguageData = languages.find(lang => lang.code === currentLanguage)

    return (
        <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 2xl:h-5 2xl:w-5 text-sidebar-secondary-foreground" />
            <select
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value as 'pt' | 'en' | 'fr' | 'es')}
                className="appearance-none bg-transparent border-none text-sidebar-secondary-foreground hover:text-white focus:outline-none focus:text-white text-sm 2xl:text-base font-medium cursor-pointer flex-1"
            >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-sidebar text-white">
                        {lang.flag} {lang.name}
                    </option>
                ))}
            </select>
            {/* Mostrar a bandeira atual ao lado do select */}
            <span className="text-lg 2xl:text-xl">
                {currentLanguageData?.flag}
            </span>
        </div>
    )
} 