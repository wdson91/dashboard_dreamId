'use client'
import { useState, useRef, useEffect } from 'react'
import { useLanguage } from './LanguageContext'
import { ChevronDown } from 'lucide-react'
import Image from 'next/image'

const languages = [
    { code: 'pt', flag: '/portugal.png', name: 'Português' },
    { code: 'en', flag: '/uk.png', name: 'English' },
    { code: 'fr', flag: '/france.png', name: 'Français' },
    { code: 'es', flag: '/spain.png', name: 'Español' }
]

export const LanguageSelector = () => {
    const { currentLanguage, setLanguage, t } = useLanguage()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const currentLanguageData = languages.find(lang => lang.code === currentLanguage)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLanguageSelect = (langCode: 'pt' | 'en' | 'fr' | 'es') => {
        setLanguage(langCode)
        setIsOpen(false)
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Current flag display and trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center gap-2 w-full text-sidebar-secondary-foreground hover:text-white text-sm font-medium cursor-pointer transition-colors"
            >
                {currentLanguageData && (
                    <Image
                        src={currentLanguageData.flag}
                        alt={currentLanguageData.name}
                        width={32}
                        height={24}
                        className="object-cover rounded-sm"
                    />
                )}
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-sidebar border border-sidebar-border rounded-md shadow-lg z-50 min-w-[160px]">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageSelect(lang.code as 'pt' | 'en' | 'fr' | 'es')}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-sidebar-accent hover:text-white transition-colors ${
                                lang.code === currentLanguage ? 'bg-sidebar-accent text-white' : 'text-sidebar-secondary-foreground'
                            }`}
                        >
                                                                <Image
                                        src={lang.flag}
                                        alt={lang.name}
                                        width={40}
                                        height={30}
                                        className="object-cover rounded-sm"
                                    />
                            <span className="text-xs">{lang.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
} 