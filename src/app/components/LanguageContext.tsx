'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'pt' | 'en' | 'fr' | 'es';

interface LanguageContextType {
    currentLanguage: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    getTranslatedPeriods: () => Array<{ value: string; label: string }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Dicionário de traduções
const translations: Record<Language, Record<string, string>> = {
    pt: {
        // Layout geral
        'layout.user': 'Usuário',
        'layout.establishment': 'Estabelecimento',
        'layout.branch': 'Filial',
        'layout.language': 'Idioma',
        'layout.logout': 'Sair',
        'layout.open_menu': 'Abrir menu',
        'layout.close_menu': 'Fechar menu',
        'layout.nif': 'NIF',
        'layout.branch_number': 'Filial',
        
        // Períodos
        'periods.today': 'Hoje',
        'periods.yesterday': 'Ontem',
        'periods.this_week': 'Esta Semana',
        'periods.this_month': 'Este Mês',
        'periods.this_quarter': 'Este Trimestre',
        'periods.this_year': 'Este Ano',
        
        // Dashboard
        'dashboard.title': 'Dashboard',
        'dashboard.welcome': 'Bem-vindo',
        'dashboard.language': 'Idioma',
        'dashboard.loading': 'Carregando...',
        'dashboard.loading_data': 'Carregando dados...',
        'dashboard.no_data': 'Nenhum dado disponível',
        'dashboard.error': 'Erro',
        'dashboard.last_update': 'Última atualização',
        'dashboard.no_establishment': 'Nenhum estabelecimento selecionado',
        'dashboard.no_establishment_message': 'Para visualizar o dashboard, você precisa selecionar um estabelecimento.',
        'dashboard.go_to_establishments': 'Ir para Estabelecimentos',
        'dashboard.incomplete_data': 'Dados incompletos recebidos da API',
        'dashboard.missing_fields': 'Campos faltando',
        
        // Dashboard Cards
        'dashboard.open_sales': 'Vendas em Aberto',
        'dashboard.consolidated_sales': 'Vendas Consolidadas',
        'dashboard.invoices': 'Número de Faturas',
        'dashboard.products_sold': 'Produtos Vendidos',
        'dashboard.average_ticket': 'Ticket Médio',
        'dashboard.open_tables': 'Mesas em Aberto',
        'dashboard.previous_period': 'Período Anterior',
        'dashboard.daily_sales': 'Vendas do dia',
        'dashboard.transactions': 'Transações realizadas',
        'dashboard.products_sold_count': 'Produtos vendidos',
        'dashboard.value_per_receipt': 'Valor por recibo',
        'dashboard.hourly_comparison': 'Comparativo por Hora',
        'dashboard.current': 'Atual',
        'dashboard.previous': 'Anterior',
        'dashboard.chart_current': 'Atual',
        'dashboard.chart_previous': 'Anterior',
        
        // Loading
        'loading.loading': 'Carregando...',
        'loading.verifying_auth': 'Verificando autenticação...',
        
        // Produtos
        'products.title': 'Produtos Vendidos',
        'products.loading': 'Carregando...',
        'products.error': 'Erro',
        'products.no_establishment': 'Nenhum estabelecimento selecionado',
        'products.no_establishment_message': 'Para visualizar os produtos, você precisa selecionar um estabelecimento.',
        'products.go_to_establishments': 'Ir para Estabelecimentos',
        'products.last_update': 'Última atualização',
        'products.period': 'Período',
        'products.total_items': 'Total de Itens',
        'products.total_amount': 'Total Montante',
        'products.best_sellers': 'Produtos Mais Vendidos',
        'products.quantity': 'Quantidade',
        'products.of_total': 'do total',
        
        // Faturas
        'invoices.title': 'Lista de Faturas',
        'invoices.loading': 'Carregando...',
        'invoices.error': 'Erro',
        'invoices.no_establishment': 'Nenhum estabelecimento selecionado',
        'invoices.no_establishment_message': 'Para visualizar as faturas, você precisa selecionar um estabelecimento.',
        'invoices.go_to_establishments': 'Ir para Estabelecimentos',
        'invoices.last_update': 'Última atualização',
        'invoices.total_invoices': 'Total de Faturas',
        'invoices.total_amount': 'Total Montante',
        'invoices.average_ticket': 'Ticket Médio',
        'invoices.search_placeholder': 'Pesquisar por número, cliente ou data...',
        'invoices.invoice_number': 'Fatura',
        'invoices.client_nif': 'NIF Cliente',
        'invoices.date': 'Data',
        'invoices.download_pdf': 'Baixar PDF',
        'invoices.downloading': 'Baixando...',
        'invoices.no_invoices_found': 'Nenhuma fatura encontrada',
        'invoices.no_invoices_message': 'Não foram encontradas faturas para o período selecionado.',
        'invoices.try_different_period': 'Tente selecionar um período diferente ou verifique se há dados disponíveis.',
        'invoices.adjust_filters': 'Tente ajustar os filtros de pesquisa.',
        
        // Estabelecimentos
        'establishments.title': 'Estabelecimentos',
        'establishments.loading': 'Carregando estabelecimentos...',
        'establishments.error': 'Erro',
        'establishments.found_count': 'estabelecimento encontrado',
        'establishments.found_count_plural': 'estabelecimentos encontrados',
        'establishments.no_establishments': 'Nenhum estabelecimento encontrado',
        'establishments.no_establishments_message': 'Não foram encontrados estabelecimentos associados à sua conta.',
        'establishments.contact_admin': 'Entre em contato com o administrador para adicionar estabelecimentos à sua conta.',
        'establishments.nif': 'NIF',
        'establishments.copy_nif': 'Copiar NIF',
        'establishments.company_name': 'Nome da Empresa',
        'establishments.address': 'Morada',
        'establishments.phone': 'Telefone',
        'establishments.email': 'Email',
        'establishments.responsible': 'Responsável',
        'establishments.select_establishment': 'Selecionar Estabelecimento',
        'establishments.selected': 'Selecionado',
        'establishments.establishment': 'Estabelecimento',
        
        // Filiais
        'branches.title': 'Filiais',
        'branches.loading': 'Carregando filiais...',
        'branches.error': 'Erro',
        'branches.found_count': 'filial encontrada',
        'branches.found_count_plural': 'filiais encontradas',
        'branches.no_branches': 'Nenhuma filial encontrada',
        'branches.no_branches_message': 'Não foram encontradas filiais associadas à sua conta.',
        'branches.view_general_data': 'Ver Dados Gerais',
        'branches.selected_branch': 'Filial selecionada',
        'branches.viewing_specific_data': 'Visualizando dados específicos desta filial',
        'branches.general_data': 'Dados Gerais',
        'branches.all_branches': 'Todas as Filiais',
        'branches.branch_number': 'Número da Filial',
        'branches.branch': 'Filial',
        'branches.total_branches': 'Total de filiais',
        'branches.consolidated_data': 'Visualizando dados consolidados de todas as filiais deste estabelecimento.',
        'branches.general_data_active': 'Dados Gerais Ativos',
        'branches.select_branch': 'Selecionar Filial',
        'branches.selected_branch_status': 'Selecionada',
        
        // Menus
        'menu.dashboard': 'Dashboard',
        'menu.products': 'Produtos',
        'menu.invoices': 'Faturas',
        'menu.analysis': 'Análises',
        'menu.establishments': 'Estabelecimentos',
        'menu.branches': 'Filiais',
        
        // Análises
        'analysis.title': 'Análise Completa',
        'analysis.period': 'Período',
        'analysis.generated': 'Análise gerada por IA para o período de',
        'analysis.to': 'a',
        'analysis.total_sales': 'Vendas Totais',
        'analysis.average_ticket': 'Ticket Médio',
        'analysis.invoices': 'Nº de Faturas',
        'analysis.items_sold': 'Itens Vendidos',
        'analysis.compared_to': 'em relação ao período anterior',
        'analysis.top_products': 'Top 5 Produtos',
        'analysis.units': 'unidades',
        'analysis.of_total': 'do total',
        'analysis.key_stats': 'Estatísticas Chave',
        'analysis.best_seller': 'Produto Mais Vendido',
        'analysis.peak_time': 'Horário de Pico',
        'analysis.period_comparison': 'Comparação de Períodos',
        

        // Botão de Atualizar
        'update_button.update': 'Atualizar',
        'update_button.wait': 'Aguarde',
        'update_button.wait_seconds': 's',
        'update_button.wait_message': 'Aguarde {seconds}s para atualizar novamente',
        'update_button.update_tooltip': 'Atualizar dados (mínimo 30s entre atualizações)',

        // Modal de Logout
        'logout.modal_title': 'Confirmar Logout',
        'logout.modal_message': 'Tem certeza que deseja sair da sua conta? Você será redirecionado para a página de login.',
        'logout.cancel': 'Cancelar',
        'logout.confirm': 'Sair',
        'logout.close': 'Fechar',
        
        // Tela de Loading
        'loading.checking_auth': 'Verificando autenticação...',
    },
    en: {
        // Layout geral
        'layout.user': 'User',
        'layout.establishment': 'Establishment',
        'layout.branch': 'Branch',
        'layout.language': 'Language',
        'layout.logout': 'Logout',
        'layout.open_menu': 'Open menu',
        'layout.close_menu': 'Close menu',
        'layout.nif': 'NIF',
        'layout.branch_number': 'Branch',
        
        // Períodos
        'periods.today': 'Today',
        'periods.yesterday': 'Yesterday',
        'periods.this_week': 'This Week',
        'periods.this_month': 'This Month',
        'periods.this_quarter': 'This Quarter',
        'periods.this_year': 'This Year',
        
        // Dashboard
        'dashboard.title': 'Dashboard',
        'dashboard.welcome': 'Welcome',
        'dashboard.language': 'Language',
        'dashboard.loading': 'Loading...',
        'dashboard.loading_data': 'Loading data...',
        'dashboard.no_data': 'No data available',
        
        // Loading
        'loading.loading': 'Loading...',
        'loading.verifying_auth': 'Verifying authentication...',
        'dashboard.error': 'Error',
        'dashboard.last_update': 'Last update',
        'dashboard.no_establishment': 'No establishment selected',
        'dashboard.no_establishment_message': 'To view the dashboard, you need to select an establishment.',
        'dashboard.go_to_establishments': 'Go to Establishments',
        'dashboard.incomplete_data': 'Incomplete data received from API',
        'dashboard.missing_fields': 'Missing fields',
        
        // Dashboard Cards
        'dashboard.open_sales': 'Open Sales',
        'dashboard.consolidated_sales': 'Consolidated Sales',
        'dashboard.invoices': 'Number of Invoices',
        'dashboard.products_sold': 'Products Sold',
        'dashboard.average_ticket': 'Average Ticket',
        'dashboard.open_tables': 'Open Tables',
        'dashboard.previous_period': 'Previous Period',
        'dashboard.daily_sales': 'Daily Sales',
        'dashboard.transactions': 'Transactions performed',
        'dashboard.products_sold_count': 'Products sold',
        'dashboard.value_per_receipt': 'Value per receipt',
        'dashboard.hourly_comparison': 'Hourly Comparison',
        'dashboard.current': 'Current',
        'dashboard.previous': 'Previous',
        'dashboard.chart_current': 'Current',
        'dashboard.chart_previous': 'Previous',
        
        // Products
        'products.title': 'Products Sold',
        'products.loading': 'Loading...',
        'products.error': 'Error',
        'products.no_establishment': 'No establishment selected',
        'products.no_establishment_message': 'To view the products, you need to select an establishment.',
        'products.go_to_establishments': 'Go to Establishments',
        'products.last_update': 'Last update',
        'products.period': 'Period',
        'products.total_items': 'Total Items',
        'products.total_amount': 'Total Amount',
        'products.best_sellers': 'Best Selling Products',
        'products.quantity': 'Quantity',
        'products.of_total': 'of total',
        
        // Invoices
        'invoices.title': 'Invoice List',
        'invoices.loading': 'Loading...',
        'invoices.error': 'Error',
        'invoices.no_establishment': 'No establishment selected',
        'invoices.no_establishment_message': 'To view the invoices, you need to select an establishment.',
        'invoices.go_to_establishments': 'Go to Establishments',
        'invoices.last_update': 'Last update',
        'invoices.total_invoices': 'Total Invoices',
        'invoices.total_amount': 'Total Amount',
        'invoices.average_ticket': 'Average Ticket',
        'invoices.search_placeholder': 'Search by number, client or date...',
        'invoices.invoice_number': 'Invoice',
        'invoices.client_nif': 'Client NIF',
        'invoices.date': 'Date',
        'invoices.download_pdf': 'Download PDF',
        'invoices.downloading': 'Downloading...',
        'invoices.no_invoices_found': 'No invoices found',
        'invoices.no_invoices_message': 'No invoices found for the selected period.',
        'invoices.try_different_period': 'Try selecting a different period or check if data is available.',
        'invoices.adjust_filters': 'Try adjusting the search filters.',
        
        // Establishments
        'establishments.title': 'Establishments',
        'establishments.loading': 'Loading establishments...',
        'establishments.error': 'Error',
        'establishments.found_count': 'establishment found',
        'establishments.found_count_plural': 'establishments found',
        'establishments.no_establishments': 'No establishments found',
        'establishments.no_establishments_message': 'No establishments associated with your account were found.',
        'establishments.contact_admin': 'Contact the administrator to add establishments to your account.',
        'establishments.nif': 'NIF',
        'establishments.copy_nif': 'Copy NIF',
        'establishments.company_name': 'Company Name',
        'establishments.address': 'Address',
        'establishments.phone': 'Phone',
        'establishments.email': 'Email',
        'establishments.responsible': 'Responsible',
        'establishments.select_establishment': 'Select Establishment',
        'establishments.selected': 'Selected',
        'establishments.establishment': 'Establishment',
        
        // Branches
        'branches.title': 'Branches',
        'branches.loading': 'Loading branches...',
        'branches.error': 'Error',
        'branches.found_count': 'branch found',
        'branches.found_count_plural': 'branches found',
        'branches.no_branches': 'No branches found',
        'branches.no_branches_message': 'No branches associated with your account were found.',
        'branches.view_general_data': 'View General Data',
        'branches.selected_branch': 'Selected branch',
        'branches.viewing_specific_data': 'Viewing specific data for this branch',
        'branches.general_data': 'General Data',
        'branches.all_branches': 'All Branches',
        'branches.branch_number': 'Branch Number',
        'branches.branch': 'Branch',
        'branches.total_branches': 'Total branches',
        'branches.consolidated_data': 'Viewing consolidated data from all branches of this establishment.',
        'branches.general_data_active': 'General Data Active',
        'branches.select_branch': 'Select Branch',
        'branches.selected_branch_status': 'Selected',
        
        // Menus
        'menu.dashboard': 'Dashboard',
        'menu.products': 'Products',
        'menu.invoices': 'Invoices',
        'menu.analysis': 'Analysis',
        'menu.establishments': 'Establishments',
        'menu.branches': 'Branches',
        
        // Analysis
        'analysis.title': 'Complete Analysis',
        'analysis.period': 'Period',
        'analysis.generated': 'AI-generated analysis for the period from',
        'analysis.to': 'to',
        'analysis.total_sales': 'Total Sales',
        'analysis.average_ticket': 'Average Ticket',
        'analysis.invoices': 'Number of Invoices',
        'analysis.items_sold': 'Items Sold',
        'analysis.compared_to': 'compared to previous period',
        'analysis.top_products': 'Top 5 Products',
        'analysis.units': 'units',
        'analysis.of_total': 'of total',
        'analysis.key_stats': 'Key Statistics',
        'analysis.best_seller': 'Best Seller',
        'analysis.peak_time': 'Peak Time',
        'analysis.period_comparison': 'Period Comparison',
        
        // Update Button
        'update_button.update': 'Update',
        'update_button.wait': 'Wait',
        'update_button.wait_seconds': 's',
        'update_button.wait_message': 'Wait {seconds}s to update again',
        'update_button.update_tooltip': 'Update data (minimum 30s between updates)',

        // Logout Modal
        'logout.modal_title': 'Confirm Logout',
        'logout.modal_message': 'Are you sure you want to log out of your account? You will be redirected to the login page.',
        'logout.cancel': 'Cancel',
        'logout.confirm': 'Logout',
        'logout.close': 'Close',
        
    },
    fr: {
        // Layout général
        'layout.user': 'Utilisateur',
        'layout.establishment': 'Établissement',
        'layout.branch': 'Succursale',
        'layout.language': 'Langue',
        'layout.logout': 'Déconnexion',
        'layout.open_menu': 'Ouvrir le menu',
        'layout.close_menu': 'Fermer le menu',
        'layout.nif': 'NIF',
        'layout.branch_number': 'Succursale',
        
        // Périodes
        'periods.today': 'Aujourd\'hui',
        'periods.yesterday': 'Hier',
        'periods.this_week': 'Cette Semaine',
        'periods.this_month': 'Ce Mois',
        'periods.this_quarter': 'Ce Trimestre',
        'periods.this_year': 'Cette Année',
        
        // Dashboard
        'dashboard.title': 'Tableau de Bord',
        'dashboard.welcome': 'Bienvenue',
        'dashboard.language': 'Langue',
        'dashboard.loading': 'Chargement...',
        'dashboard.loading_data': 'Chargement des données...',
        'dashboard.no_data': 'Aucune donnée disponible',
        'dashboard.error': 'Erreur',
        'dashboard.last_update': 'Dernière mise à jour',
        'dashboard.no_establishment': 'Aucun établissement sélectionné',
        'dashboard.no_establishment_message': 'Pour voir le tableau de bord, vous devez sélectionner un établissement.',
        'dashboard.go_to_establishments': 'Aller aux Établissements',
        'dashboard.incomplete_data': 'Données incomplètes reçues de l\'API',
        'dashboard.missing_fields': 'Champs manquants',
        
        // Dashboard Cards
        'dashboard.open_sales': 'Ventes Ouvertes',
        'dashboard.consolidated_sales': 'Ventes Consolidées',
        'dashboard.invoices': 'Nombre de Factures',
        'dashboard.products_sold': 'Produits Vendus',
        'dashboard.average_ticket': 'Ticket Moyen',
        'dashboard.open_tables': 'Tables Ouvertes',
        'dashboard.previous_period': 'Période Précédente',
        'dashboard.daily_sales': 'Ventes Quotidiennes',
        'dashboard.transactions': 'Transactions effectuées',
        'dashboard.products_sold_count': 'Produits vendus',
        'dashboard.value_per_receipt': 'Valeur par reçu',
        'dashboard.hourly_comparison': 'Comparaison Horaire',
        'dashboard.current': 'Actuel',
        'dashboard.previous': 'Précédent',
        'dashboard.chart_current': 'Actuel',
        'dashboard.chart_previous': 'Précédent',
        
        // Loading
        'loading.loading': 'Chargement...',
        'loading.verifying_auth': 'Vérification de l\'authentification...',
        
        // Produits
        'products.title': 'Produits Vendus',
        'products.loading': 'Chargement...',
        'products.error': 'Erreur',
        'products.no_establishment': 'Aucun établissement sélectionné',
        'products.no_establishment_message': 'Pour voir les produits, vous devez sélectionner un établissement.',
        'products.go_to_establishments': 'Aller aux Établissements',
        'products.last_update': 'Dernière mise à jour',
        'products.period': 'Période',
        'products.total_items': 'Total des Articles',
        'products.total_amount': 'Montant Total',
        'products.best_sellers': 'Produits les Plus Vendus',
        'products.quantity': 'Quantité',
        'products.of_total': 'du total',
        
        // Factures
        'invoices.title': 'Liste des Factures',
        'invoices.loading': 'Chargement...',
        'invoices.error': 'Erreur',
        'invoices.no_establishment': 'Aucun établissement sélectionné',
        'invoices.no_establishment_message': 'Pour voir les factures, vous devez sélectionner un établissement.',
        'invoices.go_to_establishments': 'Aller aux Établissements',
        'invoices.last_update': 'Dernière mise à jour',
        'invoices.total_invoices': 'Total des Factures',
        'invoices.total_amount': 'Montant Total',
        'invoices.average_ticket': 'Ticket Moyen',
        'invoices.search_placeholder': 'Rechercher par numéro, client ou date...',
        'invoices.invoice_number': 'Facture',
        'invoices.client_nif': 'NIF Client',
        'invoices.date': 'Date',
        'invoices.download_pdf': 'Télécharger PDF',
        'invoices.downloading': 'Téléchargement...',
        'invoices.no_invoices_found': 'Aucune facture trouvée',
        'invoices.no_invoices_message': 'Aucune facture trouvée pour la période sélectionnée.',
        'invoices.try_different_period': 'Essayez de sélectionner une période différente ou vérifiez si des données sont disponibles.',
        'invoices.adjust_filters': 'Essayez d\'ajuster les filtres de recherche.',
        
        // Établissements
        'establishments.title': 'Établissements',
        'establishments.loading': 'Chargement des établissements...',
        'establishments.error': 'Erreur',
        'establishments.found_count': 'établissement trouvé',
        'establishments.found_count_plural': 'établissements trouvés',
        'establishments.no_establishments': 'Aucun établissement trouvé',
        'establishments.no_establishments_message': 'Aucun établissement associé à votre compte n\'a été trouvé.',
        'establishments.contact_admin': 'Contactez l\'administrateur pour ajouter des établissements à votre compte.',
        'establishments.nif': 'NIF',
        'establishments.copy_nif': 'Copier NIF',
        'establishments.company_name': 'Nom de l\'Entreprise',
        'establishments.address': 'Adresse',
        'establishments.phone': 'Téléphone',
        'establishments.email': 'Email',
        'establishments.responsible': 'Responsable',
        'establishments.select_establishment': 'Sélectionner l\'Établissement',
        'establishments.selected': 'Sélectionné',
        'establishments.establishment': 'Établissement',
        
        // Succursales
        'branches.title': 'Succursales',
        'branches.loading': 'Chargement des succursales...',
        'branches.error': 'Erreur',
        'branches.found_count': 'succursale trouvée',
        'branches.found_count_plural': 'succursales trouvées',
        'branches.no_branches': 'Aucune succursale trouvée',
        'branches.no_branches_message': 'Aucune succursale associée à votre compte n\'a été trouvée.',
        'branches.view_general_data': 'Voir les Données Générales',
        'branches.selected_branch': 'Succursale sélectionnée',
        'branches.viewing_specific_data': 'Visualisation des données spécifiques de cette succursale',
        'branches.general_data': 'Données Générales',
        'branches.all_branches': 'Toutes les Succursales',
        'branches.branch_number': 'Numéro de Succursale',
        'branches.branch': 'Succursale',
        'branches.total_branches': 'Total des succursales',
        'branches.consolidated_data': 'Visualisation des données consolidées de toutes les succursales de cet établissement.',
        'branches.general_data_active': 'Données Générales Actives',
        'branches.select_branch': 'Sélectionner la Succursale',
        'branches.selected_branch_status': 'Sélectionnée',
        
        // Menus
        'menu.dashboard': 'Tableau de Bord',
        'menu.products': 'Produits',
        'menu.invoices': 'Factures',
        'menu.analysis': 'Analyses',
        'menu.establishments': 'Établissements',
        'menu.branches': 'Succursales',
        
        // Analyses
        'analysis.title': 'Analyse Complète',
        'analysis.period': 'Période',
        'analysis.generated': 'Analyse générée par IA pour la période du',
        'analysis.to': 'au',
        'analysis.total_sales': 'Ventes Totales',
        'analysis.average_ticket': 'Ticket Moyen',
        'analysis.invoices': 'Nombre de Factures',
        'analysis.items_sold': 'Articles Vendus',
        'analysis.compared_to': 'par rapport à la période précédente',
        'analysis.top_products': 'Top 5 des Produits',
        'analysis.units': 'unités',
        'analysis.of_total': 'du total',
        'analysis.key_stats': 'Statistiques Clés',
        'analysis.best_seller': 'Meilleure Vente',
        'analysis.peak_time': 'Heure de Pointe',
        'analysis.period_comparison': 'Comparaison des Périodes',
        

        // Bouton de Mise à Jour
        'update_button.update': 'Mettre à Jour',
        'update_button.wait': 'Attendez',
        'update_button.wait_seconds': 's',
        'update_button.wait_message': 'Attendez {seconds}s pour mettre à jour à nouveau',
        'update_button.update_tooltip': 'Mettre à jour les données (minimum 30s entre les mises à jour)',

        // Modal de Déconnexion
        'logout.modal_title': 'Confirmer la Déconnexion',
        'logout.modal_message': 'Êtes-vous sûr de vouloir vous déconnecter de votre compte ? Vous serez redirigé vers la page de connexion.',
        'logout.cancel': 'Annuler',
        'logout.confirm': 'Déconnexion',
        'logout.close': 'Fermer',
        
        // Écran de Chargement
    },
    es: {
        // Layout general
        'layout.user': 'Usuario',
        'layout.establishment': 'Establecimiento',
        'layout.branch': 'Sucursal',
        'layout.language': 'Idioma',
        'layout.logout': 'Cerrar Sesión',
        'layout.open_menu': 'Abrir menú',
        'layout.close_menu': 'Cerrar menú',
        'layout.nif': 'NIF',
        'layout.branch_number': 'Sucursal',
        
        // Períodos
        'periods.today': 'Hoy',
        'periods.yesterday': 'Ayer',
        'periods.this_week': 'Esta Semana',
        'periods.this_month': 'Este Mes',
        'periods.this_quarter': 'Este Trimestre',
        'periods.this_year': 'Este Año',
        
        // Dashboard
        'dashboard.title': 'Panel de Control',
        'dashboard.welcome': 'Bienvenido',
        'dashboard.language': 'Idioma',
        'dashboard.loading': 'Cargando...',
        'dashboard.loading_data': 'Cargando datos...',
        'dashboard.no_data': 'No hay datos disponibles',
        'dashboard.error': 'Error',
        'dashboard.last_update': 'Última actualización',
        'dashboard.no_establishment': 'Ningún establecimiento seleccionado',
        'dashboard.no_establishment_message': 'Para ver el panel de control, necesitas seleccionar un establecimiento.',
        'dashboard.go_to_establishments': 'Ir a Establecimientos',
        'dashboard.incomplete_data': 'Datos incompletos recibidos de la API',
        'dashboard.missing_fields': 'Campos faltantes',
        
        // Dashboard Cards
        'dashboard.open_sales': 'Ventas Abiertas',
        'dashboard.consolidated_sales': 'Ventas Consolidadas',
        'dashboard.invoices': 'Número de Facturas',
        'dashboard.products_sold': 'Productos Vendidos',
        'dashboard.average_ticket': 'Ticket Promedio',
        'dashboard.open_tables': 'Mesas Abiertas',
        'dashboard.previous_period': 'Período Anterior',
        'dashboard.daily_sales': 'Ventas Diarias',
        'dashboard.transactions': 'Transacciones realizadas',
        'dashboard.products_sold_count': 'Productos vendidos',
        'dashboard.value_per_receipt': 'Valor por recibo',
        'dashboard.hourly_comparison': 'Comparación por Hora',
        'dashboard.current': 'Actual',
        'dashboard.previous': 'Anterior',
        'dashboard.chart_current': 'Actual',
        'dashboard.chart_previous': 'Anterior',
        
        // Loading
        'loading.loading': 'Cargando...',
        'loading.verifying_auth': 'Verificando autenticación...',
        
        // Productos
        'products.title': 'Productos Vendidos',
        'products.loading': 'Cargando...',
        'products.error': 'Error',
        'products.no_establishment': 'Ningún establecimiento seleccionado',
        'products.no_establishment_message': 'Para ver los productos, necesitas seleccionar un establecimiento.',
        'products.go_to_establishments': 'Ir a Establecimientos',
        'products.last_update': 'Última actualización',
        'products.period': 'Período',
        'products.total_items': 'Total de Artículos',
        'products.total_amount': 'Monto Total',
        'products.best_sellers': 'Productos Más Vendidos',
        'products.quantity': 'Cantidad',
        'products.of_total': 'del total',
        
        // Facturas
        'invoices.title': 'Lista de Facturas',
        'invoices.loading': 'Cargando...',
        'invoices.error': 'Error',
        'invoices.no_establishment': 'Ningún establecimiento seleccionado',
        'invoices.no_establishment_message': 'Para ver las facturas, necesitas seleccionar un establecimiento.',
        'invoices.go_to_establishments': 'Ir a Establecimientos',
        'invoices.last_update': 'Última actualización',
        'invoices.total_invoices': 'Total de Facturas',
        'invoices.total_amount': 'Monto Total',
        'invoices.average_ticket': 'Ticket Promedio',
        'invoices.search_placeholder': 'Buscar por número, cliente o fecha...',
        'invoices.invoice_number': 'Factura',
        'invoices.client_nif': 'NIF Cliente',
        'invoices.date': 'Fecha',
        'invoices.download_pdf': 'Descargar PDF',
        'invoices.downloading': 'Descargando...',
        'invoices.no_invoices_found': 'No se encontraron facturas',
        'invoices.no_invoices_message': 'No se encontraron facturas para el período seleccionado.',
        'invoices.try_different_period': 'Intenta seleccionar un período diferente o verifica si hay datos disponibles.',
        'invoices.adjust_filters': 'Intenta ajustar los filtros de búsqueda.',
        
        // Establecimientos
        'establishments.title': 'Establecimientos',
        'establishments.loading': 'Cargando establecimientos...',
        'establishments.error': 'Error',
        'establishments.found_count': 'establecimiento encontrado',
        'establishments.found_count_plural': 'establecimientos encontrados',
        'establishments.no_establishments': 'Ningún establecimiento encontrado',
        'establishments.no_establishments_message': 'No se encontraron establecimientos asociados a tu cuenta.',
        'establishments.contact_admin': 'Contacta al administrador para agregar establecimientos a tu cuenta.',
        'establishments.nif': 'NIF',
        'establishments.copy_nif': 'Copiar NIF',
        'establishments.company_name': 'Nombre de la Empresa',
        'establishments.address': 'Dirección',
        'establishments.phone': 'Teléfono',
        'establishments.email': 'Email',
        'establishments.responsible': 'Responsable',
        'establishments.select_establishment': 'Seleccionar Establecimiento',
        'establishments.selected': 'Seleccionado',
        'establishments.establishment': 'Establecimiento',
        
        // Sucursales
        'branches.title': 'Sucursales',
        'branches.loading': 'Cargando sucursales...',
        'branches.error': 'Error',
        'branches.found_count': 'sucursal encontrada',
        'branches.found_count_plural': 'sucursales encontradas',
        'branches.no_branches': 'Ninguna sucursal encontrada',
        'branches.no_branches_message': 'No se encontraron sucursales asociadas a tu cuenta.',
        'branches.view_general_data': 'Ver Datos Generales',
        'branches.selected_branch': 'Sucursal seleccionada',
        'branches.viewing_specific_data': 'Visualizando datos específicos de esta sucursal',
        'branches.general_data': 'Datos Generales',
        'branches.all_branches': 'Todas las Sucursales',
        'branches.branch_number': 'Número de Sucursal',
        'branches.branch': 'Sucursal',
        'branches.total_branches': 'Total de sucursales',
        'branches.consolidated_data': 'Visualizando datos consolidados de todas las sucursales de este establecimiento.',
        'branches.general_data_active': 'Datos Generales Activos',
        'branches.select_branch': 'Seleccionar Sucursal',
        'branches.selected_branch_status': 'Seleccionada',
        
        // Menus
        'menu.dashboard': 'Panel',
        'menu.products': 'Productos',
        'menu.invoices': 'Facturas',
        'menu.analysis': 'Análisis',
        'menu.establishments': 'Establecimientos',
        'menu.branches': 'Sucursales',
        
        // Análisis
        'analysis.title': 'Análisis Completo',
        'analysis.period': 'Período',
        'analysis.generated': 'Análisis generado por IA para el período del',
        'analysis.to': 'al',
        'analysis.total_sales': 'Ventas Totales',
        'analysis.average_ticket': 'Ticket Promedio',
        'analysis.invoices': 'Número de Facturas',
        'analysis.items_sold': 'Artículos Vendidos',
        'analysis.compared_to': 'en comparación con el período anterior',
        'analysis.top_products': 'Top 5 Productos',
        'analysis.units': 'unidades',
        'analysis.of_total': 'del total',
        'analysis.key_stats': 'Estadísticas Clave',
        'analysis.best_seller': 'Más Vendido',
        'analysis.peak_time': 'Hora Pico',
        'analysis.period_comparison': 'Comparación de Períodos',
        

        // Botón de Actualizar
        'update_button.update': 'Actualizar',
        'update_button.wait': 'Espere',
        'update_button.wait_seconds': 's',
        'update_button.wait_message': 'Espere {seconds}s para actualizar nuevamente',
        'update_button.update_tooltip': 'Actualizar datos (mínimo 30s entre actualizaciones)',

        // Modal de Cierre de Sesión
        'logout.modal_title': 'Confirmar Cierre de Sesión',
        'logout.modal_message': '¿Estás seguro de que quieres cerrar sesión? Serás redirigido a la página de inicio de sesión.',
        'logout.cancel': 'Cancelar',
        'logout.confirm': 'Cerrar Sesión',
        'logout.close': 'Cerrar',
        
        // Pantalla de Carga
    }
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentLanguage, setCurrentLanguage] = useState<Language>('pt');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        // Recuperar idioma salvo no localStorage, se houver
        const savedLanguage = localStorage.getItem('language') as Language;
        if (savedLanguage && ['pt', 'en', 'fr', 'es'].includes(savedLanguage)) {
            setCurrentLanguage(savedLanguage);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setCurrentLanguage(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
        }
    };

    const t = (key: string): string => {
        return translations[currentLanguage][key] || key;
    };

    const getTranslatedPeriods = () => {
        return [
            { value: '0', label: t('periods.today') },
            { value: '1', label: t('periods.yesterday') },
            { value: '2', label: t('periods.this_week') },
            { value: '3', label: t('periods.this_month') },
            { value: '4', label: t('periods.this_quarter') },
            { value: '5', label: t('periods.this_year') },
        ];
    };

    // Evitar renderização diferente no servidor vs cliente
    if (!isClient) {
        return (
            <LanguageContext.Provider value={{ currentLanguage: 'pt', setLanguage, t, getTranslatedPeriods }}>
                {children}
            </LanguageContext.Provider>
        );
    }

    return (
        <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, getTranslatedPeriods }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}; 